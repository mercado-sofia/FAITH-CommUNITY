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

  // Get a connection for transaction
  const connection = await db.getConnection()
  
  try {
    // Start transaction
    await connection.beginTransaction()

    // Check if admin with this email already exists
    const [existingAdmin] = await connection.execute("SELECT id FROM admins WHERE email = ?", [email])
    if (existingAdmin.length > 0) {
      await connection.rollback()
      return res.status(409).json({ error: "Admin with this email already exists" })
    }

    // Check if organization with this acronym already exists
    const [existingOrg] = await connection.execute("SELECT id FROM organizations WHERE org = ?", [org])
    if (existingOrg.length > 0) {
      await connection.rollback()
      return res.status(409).json({ error: "Organization with this acronym already exists" })
    }

    // Hash password
    const saltRounds = 10
    const hashedPassword = await bcrypt.hash(password, saltRounds)

    // First, create the organization record
    const [orgResult] = await connection.execute(
      `INSERT INTO organizations (org, orgName, status, org_color) 
       VALUES (?, ?, 'ACTIVE', '#444444')`,
      [org, orgName]
    )

    const organizationId = orgResult.insertId

    // Then, create the admin record with organization_id
    const [adminResult] = await connection.execute(
      `INSERT INTO admins (org, orgName, email, password, role, status, organization_id, created_at) 
       VALUES (?, ?, ?, ?, ?, 'ACTIVE', ?, NOW())`,
      [org, orgName, email, hashedPassword, role, organizationId]
    )

    // Commit transaction
    await connection.commit()

    res.status(201).json({
      id: adminResult.insertId,
      organization_id: organizationId,
      message: "Admin and organization created successfully",
      admin: {
        id: adminResult.insertId,
        org,
        orgName,
        email,
        role,
        status: "ACTIVE",
        organization_id: organizationId,
      },
    })
  } catch (err) {
    // Rollback transaction on error
    await connection.rollback()
    console.error("Create admin error:", err)
    res.status(500).json({ error: "Internal server error while creating admin" })
  } finally {
    // Release connection
    connection.release()
  }
}

export const getAllAdmins = async (req, res) => {
  try {
    const [rows] = await db.execute(
      "SELECT id, org, orgName, email, role, status, organization_id, created_at FROM admins ORDER BY created_at DESC",
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
      "SELECT id, org, orgName, email, role, status, organization_id, created_at FROM admins WHERE id = ?",
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

  // Get a connection for transaction
  const connection = await db.getConnection()

  try {
    // Start transaction
    await connection.beginTransaction()

    // For password-only updates or status-only updates, we need to get existing data
    if ((password && password.trim() !== "" && (!org || !orgName || !email || !role)) || 
        (status && (!org || !orgName || !email || !role))) {
      
      const [existingAdmin] = await connection.execute("SELECT org, orgName, email, role, organization_id FROM admins WHERE id = ?", [id])

      if (existingAdmin.length === 0) {
        await connection.rollback()
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

      // Update admin table
      let adminQuery, adminParams

      if (password && password.trim() !== "") {
        if (password.length < 6) {
          await connection.rollback()
          return res.status(400).json({ error: "Password must be at least 6 characters long" })
        }

        const saltRounds = 10
        const hashedPassword = await bcrypt.hash(password, saltRounds)
        
        // Password update logged

        adminQuery = "UPDATE admins SET org = ?, orgName = ?, email = ?, password = ?, role = ?, status = ? WHERE id = ?"
        adminParams = [updateData.org, updateData.orgName, updateData.email, hashedPassword, updateData.role, updateData.status, id]
      } else {
        adminQuery = "UPDATE admins SET org = ?, orgName = ?, email = ?, role = ?, status = ? WHERE id = ?"
        adminParams = [updateData.org, updateData.orgName, updateData.email, updateData.role, updateData.status, id]
      }

      await connection.execute(adminQuery, adminParams)
      
      // Update organization record if org or orgName changed
      if (admin.organization_id && (updateData.org !== admin.org || updateData.orgName !== admin.orgName)) {
        await connection.execute(
          "UPDATE organizations SET org = ?, orgName = ? WHERE id = ?",
          [updateData.org, updateData.orgName, admin.organization_id]
        )
      }

      await connection.commit()

      return res.json({
        message: "Admin updated successfully",
        admin: {
          id: Number.parseInt(id),
          ...updateData,
        },
      })
    }

    // Continue with normal validation for full updates
    if (!org || !orgName || !email || !role) {
      await connection.rollback()
      return res.status(400).json({ error: "Organization acronym, organization name, email, and role are required" })
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      await connection.rollback()
      return res.status(400).json({ error: "Invalid email format" })
    }

    const [existingAdmin] = await connection.execute("SELECT id, email, organization_id FROM admins WHERE id = ?", [id])

    if (existingAdmin.length === 0) {
      await connection.rollback()
      return res.status(404).json({ error: "Admin not found" })
    }

    const currentAdmin = existingAdmin[0]
    const [emailCheck] = await connection.execute("SELECT id FROM admins WHERE email = ? AND id != ?", [email, id])

    if (emailCheck.length > 0) {
      await connection.rollback()
      return res.status(409).json({ error: "Email is already taken by another admin" })
    }

    // Update admin table
    let adminQuery, adminParams

    if (password && password.trim() !== "") {
      if (password.length < 6) {
        await connection.rollback()
        return res.status(400).json({ error: "Password must be at least 6 characters long" })
      }

      const saltRounds = 10
      const hashedPassword = await bcrypt.hash(password, saltRounds)
      
      // Password update logged

      adminQuery = "UPDATE admins SET org = ?, orgName = ?, email = ?, password = ?, role = ?, status = ? WHERE id = ?"
      adminParams = [org, orgName, email, hashedPassword, role, status || "ACTIVE", id]
    } else {
      adminQuery = "UPDATE admins SET org = ?, orgName = ?, email = ?, role = ?, status = ? WHERE id = ?"
      adminParams = [org, orgName, email, role, status || "ACTIVE", id]
    }

          // Update query executed

    // Update admin table
    await connection.execute(adminQuery, adminParams)
    
    // Update organization record if org or orgName changed
    if (currentAdmin.organization_id) {
      await connection.execute(
        "UPDATE organizations SET org = ?, orgName = ? WHERE id = ?",
        [org, orgName, currentAdmin.organization_id]
      )
      // Organization updated
    }

    await connection.commit()

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
    await connection.rollback()
    console.error("Update admin error:", err)
    res.status(500).json({ error: "Internal server error while updating admin" })
  } finally {
    connection.release()
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


