//db table: admins
import jwt from "jsonwebtoken"
import { SessionSecurity } from "../../utils/sessionSecurity.js"

// JWT secret for admin (should match the one used in admin login)
const JWT_SECRET = process.env.JWT_SECRET || "change-me-in-env"

// JWT verification middleware for admin with session security
export const verifyAdminToken = async (req, res, next) => {
  const authHeader = req.headers.authorization
  const token = authHeader && authHeader.split(" ")[1] // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ error: "Access token required" })
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET, {
      issuer: process.env.JWT_ISS || "faith-community",
      audience: process.env.JWT_AUD || "admin",
    })

    // Verify session security (IP/UA binding)
    const sessionCheck = await SessionSecurity.verifyAdminSession(
      token,
      req.ip || req.connection.remoteAddress,
      req.headers['user-agent']
    )

    if (!sessionCheck.valid) {
      return res.status(403).json({ 
        error: "Session security violation",
        reason: sessionCheck.reason 
      })
    }

    req.admin = decoded
    next()
  } catch (err) {
    return res.status(403).json({ error: "Invalid or expired token" })
  }
}
