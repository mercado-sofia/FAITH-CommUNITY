import jwt from "jsonwebtoken"
import crypto from "crypto"
import db from "../database.js"

const ACCESS_TOKEN_TTL = process.env.ACCESS_TOKEN_TTL || "15m"
const REFRESH_TOKEN_TTL_MS = Number(process.env.REFRESH_TOKEN_TTL_MS || 7 * 24 * 60 * 60 * 1000)
const JWT_SECRET = process.env.JWT_SECRET || "change-me-in-env"
const JWT_ISSUER = process.env.JWT_ISS || "faith-community-api"
const JWT_AUDIENCE = process.env.JWT_AUD || "faith-community-client"

export function signAccessToken(payload) {
  const nowSeconds = Math.floor(Date.now() / 1000)
  return jwt.sign(
    { ...payload, iat: nowSeconds, iss: JWT_ISSUER, aud: JWT_AUDIENCE },
    JWT_SECRET,
    { expiresIn: ACCESS_TOKEN_TTL }
  )
}

export function verifyAccessToken(token) {
  return jwt.verify(token, JWT_SECRET, { issuer: JWT_ISSUER, audience: JWT_AUDIENCE })
}

export async function issueRefreshToken(userId, { userAgent, ipAddress } = {}) {
  const token = crypto.randomBytes(48).toString("hex")
  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_MS)
  await db.execute(
    `INSERT INTO refresh_tokens (user_id, token, expires_at, user_agent, ip_address) VALUES (?, ?, ?, ?, ?)`,
    [userId, token, expiresAt, (userAgent || null), (ipAddress || null)]
  )
  return { token, expiresAt }
}

export async function rotateRefreshToken(oldToken, userId, { userAgent, ipAddress } = {}) {
  // Revoke old token and issue a new one atomically
  const connection = await db.getConnection?.() || null
  try {
    if (connection) await connection.beginTransaction()
    await db.execute(`UPDATE refresh_tokens SET revoked_at = NOW() WHERE token = ? AND user_id = ?`, [oldToken, userId])
    const { token, expiresAt } = await issueRefreshToken(userId, { userAgent, ipAddress })
    if (connection) await connection.commit()
    return { token, expiresAt }
  } catch (e) {
    if (connection) await connection.rollback()
    throw e
  } finally {
    if (connection) connection.release?.()
  }
}

export async function revokeAllUserRefreshTokens(userId) {
  await db.execute(`UPDATE refresh_tokens SET revoked_at = NOW() WHERE user_id = ? AND revoked_at IS NULL`, [userId])
}

export async function revokeRefreshToken(token) {
  await db.execute(`UPDATE refresh_tokens SET revoked_at = NOW() WHERE token = ? AND revoked_at IS NULL`, [token])
}

export async function findValidRefreshToken(token) {
  const [rows] = await db.execute(
    `SELECT * FROM refresh_tokens WHERE token = ? AND revoked_at IS NULL AND expires_at > NOW() LIMIT 1`,
    [token]
  )
  return rows[0] || null
}

export function getRefreshCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: (process.env.COOKIE_SAMESITE || "lax").toLowerCase(),
    path: "/",
    maxAge: REFRESH_TOKEN_TTL_MS,
  }
}

export default {
  signAccessToken,
  verifyAccessToken,
  issueRefreshToken,
  rotateRefreshToken,
  revokeAllUserRefreshTokens,
  revokeRefreshToken,
  findValidRefreshToken,
  getRefreshCookieOptions,
}


