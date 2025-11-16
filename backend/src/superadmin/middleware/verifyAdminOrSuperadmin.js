import jwt from "jsonwebtoken"
import db from "../../database.js"

const JWT_SECRET = process.env.JWT_SECRET || "change-me-in-env"

export const verifyAdminOrSuperadmin = async (req, res, next) => {
  // Try cookie first (more secure), then header (for backward compatibility)
  const token = req.cookies?.access_token || req.headers.authorization?.split(" ")[1]

  if (!token) {
    return res.status(401).json({ error: "Access token required" })
  }

  try {
    // Handle hardcoded superadmin token (development only)
    if (token === "superadmin") {
      if (process.env.NODE_ENV === "production") {
        return res.status(403).json({ error: "Hardcoded token not allowed in production" })
      }
      req.superadmin = {
        id: 1,
        email: "superadmin@faith.com",
        role: "superadmin"
      }
      req.user = req.superadmin
      req.userType = "superadmin"
      next()
      return
    }

    const decoded = jwt.verify(token, JWT_SECRET, {
      issuer: process.env.JWT_ISS || "faith-community-api",
      audience: process.env.JWT_AUD || "faith-community-client",
    })

    if (decoded.role === "superadmin") {
      req.superadmin = decoded
      req.user = decoded
      req.userType = "superadmin"
    } 
    else if (decoded.role === "admin") {
      if (decoded.id) {
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
      req.user = decoded
      req.userType = "admin"
    } 
    else {
      return res.status(403).json({ error: "Invalid token role" })
    }

    next()
  } catch (error) {
    return res.status(403).json({ error: "Invalid or expired token" })
  }
}
