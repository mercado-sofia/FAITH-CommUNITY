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
      'SELECT id, org, orgName, email, password, role, status FROM admins WHERE email = ? AND status = "ACTIVE"',
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
        orgName: admin.orgName,
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
        orgName: admin.orgName,
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
  const { org, orgName, email, password, role } = req.body

  if (!org || !orgName || !email || !password || !role) {
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
      `INSERT INTO admins (org, orgName, email, password, role, status, created_at) 
       VALUES (?, ?, ?, ?, ?, 'ACTIVE', NOW())`,
      [org, orgName, email, hashedPassword, role],
    )

    res.status(201).json({
      id: result.insertId,
      message: "Admin created successfully",
      admin: {
        id: result.insertId,
        org,
        orgName,
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
      "SELECT id, org, orgName, email, role, status, created_at FROM admins ORDER BY created_at DESC",
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
    const [rows] = await db.execute(
      "SELECT id, org, orgName, email, role, status, created_at FROM admins WHERE id = ?",
      [id],
    )

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
  const { org, orgName, email, password, role, status } = req.body

  if (!id || isNaN(id)) {
    return res.status(400).json({ error: "Invalid admin ID" })
  }

  // For password-only updates or status-only updates, we need to get existing data
  if ((password && password.trim() !== "" && (!org || !orgName || !email || !role)) || 
      (status && (!org || !orgName || !email || !role))) {
    try {
      const [existingAdmin] = await db.execute("SELECT org, orgName, email, role FROM admins WHERE id = ?", [id])

      if (existingAdmin.length === 0) {
        return res.status(404).json({ error: "Admin not found" })
      }

      const admin = existingAdmin[0]
      // Use existing data for missing fields
      const updateData = {
        org: org || admin.org,
        orgName: orgName || admin.orgName,
        email: email || admin.email,
        role: role || admin.role,
        status: status || admin.status || "ACTIVE",
      }

      // Update admin table (trigger will automatically sync organization email)
      let adminQuery, adminParams

      if (password && password.trim() !== "") {
        if (password.length < 6) {
          return res.status(400).json({ error: "Password must be at least 6 characters long" })
        }

        const saltRounds = 10
        const hashedPassword = await bcrypt.hash(password, saltRounds)
        
        console.log(`🔐 Password update for admin ID: ${id}`)
        console.log(`📝 New password length: ${password.length}`)
        console.log(`🔒 Hashed password length: ${hashedPassword.length}`)

        adminQuery = "UPDATE admins SET org = ?, orgName = ?, email = ?, password = ?, role = ?, status = ? WHERE id = ?"
        adminParams = [updateData.org, updateData.orgName, updateData.email, hashedPassword, updateData.role, updateData.status, id]
      } else {
        adminQuery = "UPDATE admins SET org = ?, orgName = ?, email = ?, role = ?, status = ? WHERE id = ?"
        adminParams = [updateData.org, updateData.orgName, updateData.email, updateData.role, updateData.status, id]
      }

      console.log(`📊 Update query: ${adminQuery}`)
      console.log(`📋 Update params:`, adminParams)

      await db.execute(adminQuery, adminParams)
      
      // Verify the update was successful
      const [verifyUpdate] = await db.execute("SELECT password FROM admins WHERE id = ?", [id])
      if (verifyUpdate.length > 0) {
        console.log(`✅ Password update verified for admin ID: ${id}`)
        console.log(`🔍 Stored password hash length: ${verifyUpdate[0].password.length}`)
      }

      // Log the change for debugging
      if (updateData.email !== admin.email) {
        console.log(`🔄 Admin email updated from '${admin.email}' to '${updateData.email}' for org: ${updateData.org}`)
        console.log(`📧 Email is now the single source of truth in admins table`)
      }

      if (password && password.trim() !== "") {
        console.log(`🔐 Password updated for admin ID: ${id}`)
      }

      return res.json({
        message: "Admin updated successfully",
        admin: {
          id: Number.parseInt(id),
          ...updateData,
        },
      })
    } catch (err) {
      console.error("Update admin error:", err)
      return res.status(500).json({ error: "Internal server error while updating admin" })
    }
  }

  // Continue with normal validation for full updates
  if (!org || !orgName || !email || !role) {
    return res.status(400).json({ error: "Organization acronym, organization name, email, and role are required" })
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(email)) {
    return res.status(400).json({ error: "Invalid email format" })
  }

  try {
    const [existingAdmin] = await db.execute("SELECT id, email FROM admins WHERE id = ?", [id])

    if (existingAdmin.length === 0) {
      return res.status(404).json({ error: "Admin not found" })
    }

    const currentAdmin = existingAdmin[0]
    const [emailCheck] = await db.execute("SELECT id FROM admins WHERE email = ? AND id != ?", [email, id])

    if (emailCheck.length > 0) {
      return res.status(409).json({ error: "Email is already taken by another admin" })
    }

    // Update admin table (trigger will automatically sync organization email)
    let adminQuery, adminParams

    if (password && password.trim() !== "") {
      if (password.length < 6) {
        return res.status(400).json({ error: "Password must be at least 6 characters long" })
      }

      const saltRounds = 10
      const hashedPassword = await bcrypt.hash(password, saltRounds)
      
      console.log(`🔐 Password update for admin ID: ${id}`)
      console.log(`📝 New password length: ${password.length}`)
      console.log(`🔒 Hashed password length: ${hashedPassword.length}`)

      adminQuery = "UPDATE admins SET org = ?, orgName = ?, email = ?, password = ?, role = ?, status = ? WHERE id = ?"
      adminParams = [org, orgName, email, hashedPassword, role, status || "ACTIVE", id]
    } else {
      adminQuery = "UPDATE admins SET org = ?, orgName = ?, email = ?, role = ?, status = ? WHERE id = ?"
      adminParams = [org, orgName, email, role, status || "ACTIVE", id]
    }

    console.log(`📊 Update query: ${adminQuery}`)
    console.log(`📋 Update params:`, adminParams)

    // Update admin table
    await db.execute(adminQuery, adminParams)
    
    // Verify the update was successful
    const [verifyUpdate] = await db.execute("SELECT password FROM admins WHERE id = ?", [id])
    if (verifyUpdate.length > 0) {
      console.log(`✅ Password update verified for admin ID: ${id}`)
      console.log(`🔍 Stored password hash length: ${verifyUpdate[0].password.length}`)
    }

    // Log the change for debugging
    if (email !== currentAdmin.email) {
      console.log(`🔄 Admin email updated from '${currentAdmin.email}' to '${email}' for org: ${org}`)
      console.log(`📧 Email is now the single source of truth in admins table`)
    }

    if (password && password.trim() !== "") {
      console.log(`🔐 Password updated for admin ID: ${id}`)
    }

    res.json({
      message: "Admin updated successfully",
      admin: {
        id: Number.parseInt(id),
        org,
        orgName,
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

// Verify password for email change
export const verifyPasswordForEmailChange = async (req, res) => {
  const { id } = req.params
  const { currentPassword } = req.body

  if (!id || isNaN(id)) {
    return res.status(400).json({ error: "Invalid admin ID" })
  }

  if (!currentPassword || currentPassword.trim() === "") {
    return res.status(400).json({ error: "Current password is required" })
  }

  try {
    // Get admin data including hashed password
    const [adminRows] = await db.execute(
      'SELECT id, password, status FROM admins WHERE id = ? AND status = "ACTIVE"',
      [id]
    )

    if (adminRows.length === 0) {
      return res.status(404).json({ error: "Admin not found or account inactive" })
    }

    const admin = adminRows[0]

    // Verify the current password
    const isPasswordValid = await bcrypt.compare(currentPassword, admin.password)

    if (!isPasswordValid) {
      return res.status(401).json({ error: "Invalid current password" })
    }

    res.json({
      success: true,
      message: "Password verified successfully"
    })
  } catch (err) {
    console.error("Password verification error:", err)
    res.status(500).json({ error: "Internal server error during password verification" })
  }
}

// Verify password for password change
export const verifyPasswordForPasswordChange = async (req, res) => {
  const { id } = req.params
  const { currentPassword } = req.body

  if (!id || isNaN(id)) {
    return res.status(400).json({ error: "Invalid admin ID" })
  }

  if (!currentPassword || currentPassword.trim() === "") {
    return res.status(400).json({ error: "Current password is required" })
  }

  try {
    // Get admin data including hashed password
    const [adminRows] = await db.execute(
      'SELECT id, password, status FROM admins WHERE id = ? AND status = "ACTIVE"',
      [id]
    )

    if (adminRows.length === 0) {
      return res.status(404).json({ error: "Admin not found or account inactive" })
    }

    const admin = adminRows[0]

    // Verify the current password
    const isPasswordValid = await bcrypt.compare(currentPassword, admin.password)

    if (!isPasswordValid) {
      return res.status(401).json({ error: "Invalid current password" })
    }

    res.json({
      success: true,
      message: "Password verified successfully"
    })
  } catch (err) {
    console.error("Password verification error:", err)
    res.status(500).json({ error: "Internal server error during password verification" })
  }
}


