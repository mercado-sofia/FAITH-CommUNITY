// db table: superadmin
import db from "../../database.js"
import bcrypt from "bcrypt"
import jwt from "jsonwebtoken"


// Simple JWT secret for superadmin
const JWT_SECRET = "faith-community-superadmin-secret-2024"


// Superadmin login endpoint
export const loginSuperadmin = async (req, res) => {
  const { email, password } = req.body


  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required" })
  }


  try {
    const [superadminRows] = await db.execute(
      'SELECT id, username, password, created_at, updated_at FROM superadmin WHERE username = ?',
      [email],
    )


    if (superadminRows.length === 0) {
      return res.status(401).json({ error: "Invalid credentials" })
    }


    const superadmin = superadminRows[0]
    const isPasswordValid = await bcrypt.compare(password, superadmin.password)


    if (!isPasswordValid) {
      return res.status(401).json({ error: "Invalid credentials" })
    }


    // Generate JWT token
    const token = jwt.sign(
      {
        id: superadmin.id,
        username: superadmin.username,
        role: "superadmin",
      },
      JWT_SECRET,
      { expiresIn: "24h" },
    )


    res.json({
      message: "Login successful",
      token,
      superadmin: {
        id: superadmin.id,
        username: superadmin.username,
        email: superadmin.username, // Using username as email for compatibility
        name: "Super Administrator",
        role: "superadmin",
      },
    })
  } catch (err) {
    console.error("Superadmin login error:", err)
    res.status(500).json({ error: "Internal server error during login" })
  }
}


// JWT verification middleware for superadmin
export const verifySuperadminToken = (req, res, next) => {
  const authHeader = req.headers.authorization
  const token = authHeader && authHeader.split(" ")[1] // Bearer TOKEN


  if (!token) {
    return res.status(401).json({ error: "Access token required" })
  }


  try {
    const decoded = jwt.verify(token, JWT_SECRET)
    req.superadmin = decoded
    next()
  } catch (err) {
    return res.status(403).json({ error: "Invalid or expired token" })
  }
}


// Get superadmin profile
export const getSuperadminProfile = async (req, res) => {
  const { id } = req.params


  if (!id || isNaN(id)) {
    return res.status(400).json({ error: "Invalid superadmin ID" })
  }


  try {
    const [rows] = await db.execute(
      "SELECT id, username, created_at, updated_at FROM superadmin WHERE id = ?",
      [id],
    )


    if (rows.length === 0) {
      return res.status(404).json({ message: "Superadmin not found" })
    }


    const superadmin = rows[0]
    res.json({
      id: superadmin.id,
      username: superadmin.username,
      email: superadmin.username,
      name: "Super Administrator",
      role: "superadmin",
      created_at: superadmin.created_at,
      updated_at: superadmin.updated_at,
    })
  } catch (err) {
    console.error("Get superadmin profile error:", err)
    res.status(500).json({ error: "Internal server error while fetching profile" })
  }
}


// Update superadmin password
export const updateSuperadminPassword = async (req, res) => {
  const { id } = req.params
  const { currentPassword, newPassword } = req.body


  if (!id || isNaN(id)) {
    return res.status(400).json({ error: "Invalid superadmin ID" })
  }


  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: "Current password and new password are required" })
  }


  if (newPassword.length < 6) {
    return res.status(400).json({ error: "Password must be at least 6 characters long" })
  }


  try {
    // Get current superadmin data
    const [superadminRows] = await db.execute(
      'SELECT id, password FROM superadmin WHERE id = ?',
      [id]
    )


    if (superadminRows.length === 0) {
      return res.status(404).json({ error: "Superadmin not found" })
    }


    const superadmin = superadminRows[0]


    // Verify current password
    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, superadmin.password)


    if (!isCurrentPasswordValid) {
      return res.status(401).json({ error: "Current password is incorrect" })
    }


    // Hash new password
    const saltRounds = 10
    const hashedNewPassword = await bcrypt.hash(newPassword, saltRounds)


    // Update password
    await db.execute(
      'UPDATE superadmin SET password = ?, updated_at = NOW() WHERE id = ?',
      [hashedNewPassword, id]
    )


    res.json({ message: "Password updated successfully" })
  } catch (err) {
    console.error("Update superadmin password error:", err)
    res.status(500).json({ error: "Internal server error while updating password" })
  }
}


// Update superadmin email
export const updateSuperadminEmail = async (req, res) => {
  const { id } = req.params
  const { newEmail } = req.body

  if (!id || isNaN(id)) {
    return res.status(400).json({ error: "Invalid superadmin ID" })
  }

  if (!newEmail || !newEmail.trim()) {
    return res.status(400).json({ error: "New email is required" })
  }

  // Basic email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(newEmail)) {
    return res.status(400).json({ error: "Invalid email format" })
  }

  try {
    // Check if superadmin exists
    const [superadminRows] = await db.execute(
      'SELECT id FROM superadmin WHERE id = ?',
      [id]
    )

    if (superadminRows.length === 0) {
      return res.status(404).json({ error: "Superadmin not found" })
    }

    // Check if email is already in use by another superadmin
    const [existingEmailRows] = await db.execute(
      'SELECT id FROM superadmin WHERE username = ? AND id != ?',
      [newEmail, id]
    )

    if (existingEmailRows.length > 0) {
      return res.status(409).json({ error: "Email address is already in use" })
    }

    // Update email (username field)
    await db.execute(
      'UPDATE superadmin SET username = ?, updated_at = NOW() WHERE id = ?',
      [newEmail, id]
    )

    res.json({ 
      message: "Email updated successfully",
      email: newEmail
    })
  } catch (err) {
    console.error("Update superadmin email error:", err)
    res.status(500).json({ error: "Internal server error while updating email" })
  }
}
