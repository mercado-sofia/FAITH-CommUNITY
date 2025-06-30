// db table: admins
import db from "../../database.js"
import bcrypt from "bcrypt"
import jwt from "jsonwebtoken"

// Simple JWT secret - you can change this to any string
const JWT_SECRET = "faith-community-admin-secret-2024"

// Admin login endpoint
export const loginAdmin = async (req, res) => {
  const { email, password } = req.body

  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required" })
  }

  try {
    const [adminRows] = await db.execute(
      'SELECT id, org, email, password, role, status FROM admins WHERE email = ? AND status = "ACTIVE"',
      [email],
    )

    if (adminRows.length === 0) {
      return res.status(401).json({ error: "Invalid credentials or account inactive" })
    }

    const admin = adminRows[0]
    const isPasswordValid = await bcrypt.compare(password, admin.password)

    if (!isPasswordValid) {
      return res.status(401).json({ error: "Invalid credentials" })
    }

    // Generate JWT token
    const token = jwt.sign(
      {
        id: admin.id,
        email: admin.email,
        role: admin.role,
        org: admin.org,
      },
      JWT_SECRET,
      { expiresIn: "24h" },
    )

    res.json({
      message: "Login successful",
      token,
      admin: {
        id: admin.id,
        org: admin.org,
        email: admin.email,
        role: admin.role,
        status: admin.status,
      },
    })
  } catch (err) {
    console.error("Admin login error:", err)
    res.status(500).json({ error: "Internal server error during login" })
  }
}

// JWT verification middleware
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

export const createAdmin = async (req, res) => {
  const { org, email, password, role } = req.body

  if (!org || !email || !password || !role) {
    return res.status(400).json({ error: "All fields are required" })
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(email)) {
    return res.status(400).json({ error: "Invalid email format" })
  }

  if (password.length < 6) {
    return res.status(400).json({ error: "Password must be at least 6 characters long" })
  }

  try {
    const [existingAdmin] = await db.execute("SELECT id FROM admins WHERE email = ?", [email])

    if (existingAdmin.length > 0) {
      return res.status(409).json({ error: "Admin with this email already exists" })
    }

    const saltRounds = 10
    const hashedPassword = await bcrypt.hash(password, saltRounds)

    const [result] = await db.execute(
      `INSERT INTO admins (org, email, password, role, status, created_at) 
       VALUES (?, ?, ?, ?, 'ACTIVE', NOW())`,
      [org, email, hashedPassword, role],
    )

    res.status(201).json({
      id: result.insertId,
      message: "Admin created successfully",
      admin: {
        id: result.insertId,
        org,
        email,
        role,
        status: "ACTIVE",
      },
    })
  } catch (err) {
    console.error("Create admin error:", err)
    res.status(500).json({ error: "Internal server error while creating admin" })
  }
}

export const getAllAdmins = async (req, res) => {
  try {
    const [rows] = await db.execute(
      "SELECT id, org, email, role, status, created_at FROM admins ORDER BY created_at DESC",
    )
    res.json(rows)
  } catch (err) {
    console.error("Get all admins error:", err)
    res.status(500).json({ error: "Internal server error while fetching admins" })
  }
}

export const getAdminById = async (req, res) => {
  const { id } = req.params

  if (!id || isNaN(id)) {
    return res.status(400).json({ error: "Invalid admin ID" })
  }

  try {
    const [rows] = await db.execute("SELECT id, org, email, role, status, created_at FROM admins WHERE id = ?", [
      id,
    ])

    if (rows.length === 0) {
      return res.status(404).json({ message: "Admin not found" })
    }

    res.json(rows[0])
  } catch (err) {
    console.error("Get admin by ID error:", err)
    res.status(500).json({ error: "Internal server error while fetching admin" })
  }
}

export const updateAdmin = async (req, res) => {
  const { id } = req.params
  const { org, email, password, role, status } = req.body

  if (!id || isNaN(id)) {
    return res.status(400).json({ error: "Invalid admin ID" })
  }

  if (!org || !email || !role) {
    return res.status(400).json({ error: "Organization name, email, and role are required" })
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(email)) {
    return res.status(400).json({ error: "Invalid email format" })
  }

  try {
    const [existingAdmin] = await db.execute("SELECT id FROM admins WHERE id = ?", [id])

    if (existingAdmin.length === 0) {
      return res.status(404).json({ error: "Admin not found" })
    }

    const [emailCheck] = await db.execute("SELECT id FROM admins WHERE email = ? AND id != ?", [email, id])

    if (emailCheck.length > 0) {
      return res.status(409).json({ error: "Email is already taken by another admin" })
    }

    let query, params

    if (password && password.trim() !== "") {
      if (password.length < 6) {
        return res.status(400).json({ error: "Password must be at least 6 characters long" })
      }

      const saltRounds = 10
      const hashedPassword = await bcrypt.hash(password, saltRounds)

      query = "UPDATE admins SET org = ?, email = ?, password = ?, role = ?, status = ? WHERE id = ?"
      params = [org, email, hashedPassword, role, status || "ACTIVE", id]
    } else {
      query = "UPDATE admins SET org = ?, email = ?, role = ?, status = ? WHERE id = ?"
      params = [org, email, role, status || "ACTIVE", id]
    }

    await db.execute(query, params)

    res.json({
      message: "Admin updated successfully",
      admin: {
        id: Number.parseInt(id),
        org,
        email,
        role,
        status: status || "ACTIVE",
      },
    })
  } catch (err) {
    console.error("Update admin error:", err)
    res.status(500).json({ error: "Internal server error while updating admin" })
  }
}

export const deleteAdmin = async (req, res) => {
  const { id } = req.params

  if (!id || isNaN(id)) {
    return res.status(400).json({ error: "Invalid admin ID" })
  }

  try {
    const [existingAdmin] = await db.execute("SELECT id FROM admins WHERE id = ?", [id])

    if (existingAdmin.length === 0) {
      return res.status(404).json({ error: "Admin not found" })
    }

    // Soft delete: set status to INACTIVE
    await db.execute('UPDATE admins SET status = "INACTIVE" WHERE id = ?', [id])

    res.json({ message: "Admin deactivated successfully (soft deleted)" })
  } catch (err) {
    console.error("Delete admin error:", err)
    res.status(500).json({ error: "Internal server error while deactivating admin" })
  }
}
