import jwt from "jsonwebtoken"
import db from "../../database.js"

// JWT secret via env
const JWT_SECRET = process.env.JWT_SECRET || "change-me-in-env"

// Middleware that accepts both admin and superadmin tokens
export const verifyAdminOrSuperadmin = async (req, res, next) => {
  const authHeader = req.headers.authorization
  const token = authHeader && authHeader.split(" ")[1] // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ error: "Access token required" })
  }

  try {
    // Handle hardcoded superadmin token (only in development)
    if (token === "superadmin") {
      // Reject hardcoded tokens in production for security
      if (process.env.NODE_ENV === "production") {
        return res.status(403).json({ error: "Hardcoded token not allowed in production" })
      }
      // Allow in development only
      req.superadmin = {
        id: 1,
        username: "superadmin@faith.com",
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

    // Check if it's a superadmin token
    if (decoded.role === "superadmin") {
      req.superadmin = decoded
      req.user = decoded
      req.userType = "superadmin"
    } 
    // Check if it's an admin token
    else if (decoded.role === "admin") {
      // Check if admin account and organization are active
      if (decoded.id) {
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
