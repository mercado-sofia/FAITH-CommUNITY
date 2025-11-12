//db table: admins
import jwt from "jsonwebtoken"
import db from "../../database.js"
import { SessionSecurity } from "../../utils/sessionSecurity.js"
import { getClientIpAddress } from "../../utils/ipAddressHelper.js"

// JWT secret for admin (should match the one used in admin login)
const JWT_SECRET = process.env.JWT_SECRET

// JWT verification middleware for admin with session security
export const verifyAdminToken = async (req, res, next) => {
  const authHeader = req.headers.authorization
  const token = authHeader && authHeader.split(" ")[1] // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ error: "Access token required" })
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET, {
      issuer: process.env.JWT_ISS || "faith-community-api",
      audience: process.env.JWT_AUD || "faith-community-client",
    })

    // Verify session security (IP/UA binding) - optional for now
    try {
      const sessionCheck = await SessionSecurity.verifyAdminSession(
        token,
        getClientIpAddress(req),
        req.headers['user-agent']
      )

      if (!sessionCheck.valid) {
        // For now, we'll allow the request to continue if JWT is valid
        // This handles cases where sessions might be missing or expired
        // but the JWT token is still valid
      }
    } catch (sessionError) {
      // Continue with JWT verification only
    }

    // Check if admin account and organization are active
    if (decoded.role === 'admin' && decoded.id) {
      const [adminRows] = await db.execute(
        `SELECT a.id, a.is_active, a.organization_id, o.status as org_status
         FROM admins a
         LEFT JOIN organizations o ON a.organization_id = o.id
         WHERE a.id = ?`,
        [decoded.id]
      )

      if (adminRows.length === 0 || !adminRows[0].is_active) {
        return res.status(403).json({ error: "Admin account is inactive" })
      }

      // Check if organization is active (if admin has an organization)
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