import jwt from "jsonwebtoken"
import db from "../../database.js"
import { SessionSecurity } from "../../utils/sessionSecurity.js"
import { getClientIpAddress } from "../../utils/ipAddressHelper.js"

const JWT_SECRET = process.env.JWT_SECRET

export const verifyAdminToken = async (req, res, next) => {
  // Try cookie first (more secure), then header (for backward compatibility)
  const token = req.cookies?.access_token || req.headers.authorization?.split(" ")[1]

  if (!token) {
    return res.status(401).json({ error: "Access token required" })
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET, {
      issuer: process.env.JWT_ISS || "faith-community-api",
      audience: process.env.JWT_AUD || "faith-community-client",
    })

    try {
      const sessionCheck = await SessionSecurity.verifyAdminSession(
        token,
        getClientIpAddress(req),
        req.headers['user-agent']
      )
    } catch (sessionError) {
      // Continue with JWT verification only if session check fails
    }

    if (decoded.role === 'admin' && decoded.id) {
      const [adminRows] = await db.execute(
        `SELECT u.id, u.is_active, u.organization_id, o.status as org_status
         FROM users u
         LEFT JOIN organizations o ON u.organization_id = o.id
         WHERE u.id = ? AND u.role = 'admin'`,
        [decoded.id]
      )

      if (adminRows.length === 0 || !adminRows[0].is_active) {
        return res.status(403).json({ error: "Admin account is inactive" })
      }

      if (adminRows[0].organization_id && adminRows[0].org_status !== 'ACTIVE') {
        return res.status(403).json({ error: "Organization is inactive" })
      }
    }

    req.admin = decoded
    next()
  } catch (err) {
    return res.status(403).json({ error: "Invalid or expired token" })
  }
}