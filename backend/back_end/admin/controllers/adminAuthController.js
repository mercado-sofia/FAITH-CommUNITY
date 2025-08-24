import jwt from "jsonwebtoken"

// JWT secret for admin (should match the one used in admin login)
const JWT_SECRET = "faith-community-admin-secret-2024"

// JWT verification middleware for admin
export const verifyAdminToken = (req, res, next) => {
  const authHeader = req.headers.authorization
  const token = authHeader && authHeader.split(" ")[1] // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ error: "Access token required" })
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET)
    req.admin = decoded
    next()
  } catch (err) {
    return res.status(403).json({ error: "Invalid or expired token" })
  }
}
