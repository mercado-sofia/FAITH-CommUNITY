import jwt from "jsonwebtoken"

// JWT secret via env
const JWT_SECRET = process.env.JWT_SECRET || "change-me-in-env"

// Middleware that accepts both admin and superadmin tokens
export const verifyAdminOrSuperadmin = (req, res, next) => {
  const authHeader = req.headers.authorization
  const token = authHeader && authHeader.split(" ")[1] // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ error: "Access token required" })
  }

  try {
    // Handle hardcoded superadmin token
    if (token === "superadmin") {
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
      issuer: process.env.JWT_ISS || "faith-community",
      audience: process.env.JWT_AUD || "admin",
    })

    // Check if it's a superadmin token
    if (decoded.role === "superadmin") {
      req.superadmin = decoded
      req.user = decoded
      req.userType = "superadmin"
    } 
    // Check if it's an admin token
    else if (decoded.role === "admin") {
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
