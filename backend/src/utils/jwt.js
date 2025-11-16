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

export function getAccessTokenCookieOptions() {
  // Convert ACCESS_TOKEN_TTL to seconds (e.g., "15m" = 900 seconds)
  const ttlMatch = ACCESS_TOKEN_TTL.match(/(\d+)([smhd])/);
  let seconds = 15 * 60; // Default 15 minutes
  
  if (ttlMatch) {
    const value = parseInt(ttlMatch[1]);
    const unit = ttlMatch[2];
    seconds = unit === 's' ? value : unit === 'm' ? value * 60 : unit === 'h' ? value * 3600 : value * 86400;
  }
  
  const isDevelopment = process.env.NODE_ENV !== "production";
  
  // IMPORTANT: For cross-origin cookies (localhost:3000 -> localhost:8080)
  // Chrome allows SameSite=None with Secure=false for localhost, but it's not reliable
  // Better approach: Use SameSite=Lax and ensure requests are same-site
  // OR use a proxy to make requests same-origin
  // For now, we'll use Lax which works for same-site navigation
  const sameSiteValue = process.env.COOKIE_SAMESITE 
    ? (process.env.COOKIE_SAMESITE).toLowerCase()
    : "lax"; // Changed from "none" to "lax" - works better for localhost
  
  const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production", // false in dev (localhost), true in prod (HTTPS)
    sameSite: sameSiteValue,
    path: "/",
    maxAge: seconds, // Cookie maxAge is in seconds
  };
  
  // In development with Next.js rewrites, cookies are set by backend but forwarded through Next.js
  // Don't set domain - let it default to the request origin
  // This allows cookies to work when proxied through Next.js (localhost:3000)
  if (process.env.COOKIE_DOMAIN) {
    cookieOptions.domain = process.env.COOKIE_DOMAIN;
  } else if (process.env.NODE_ENV === "production") {
    // In production, you might want to set domain for subdomain sharing
    // But don't set it in dev to allow Next.js proxy to work
  }
  
  return cookieOptions;
}

export function getRefreshCookieOptions() {
  const isDevelopment = process.env.NODE_ENV !== "production";
  
  // IMPORTANT: For cross-origin cookies (localhost:3000 -> localhost:8080)
  // Use SameSite=Lax which works better for localhost
  const sameSiteValue = process.env.COOKIE_SAMESITE 
    ? (process.env.COOKIE_SAMESITE).toLowerCase()
    : "lax"; // Changed from "none" to "lax" - works better for localhost
  
  const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production", // false in dev (localhost), true in prod (HTTPS)
    sameSite: sameSiteValue,
    path: "/",
    maxAge: Math.floor(REFRESH_TOKEN_TTL_MS / 1000), // Convert milliseconds to seconds
  };
  
  // In development with Next.js rewrites, cookies are set by backend but forwarded through Next.js
  // Don't set domain - let it default to the request origin
  // This allows cookies to work when proxied through Next.js (localhost:3000)
  if (process.env.COOKIE_DOMAIN) {
    cookieOptions.domain = process.env.COOKIE_DOMAIN;
  } else if (process.env.NODE_ENV === "production") {
    // In production, you might want to set domain for subdomain sharing
    // But don't set it in dev to allow Next.js proxy to work
  }
  
  return cookieOptions;
}

export default {
  signAccessToken,
  verifyAccessToken,
  issueRefreshToken,
  rotateRefreshToken,
  revokeAllUserRefreshTokens,
  revokeRefreshToken,
  findValidRefreshToken,
  getAccessTokenCookieOptions,
  getRefreshCookieOptions,
}


