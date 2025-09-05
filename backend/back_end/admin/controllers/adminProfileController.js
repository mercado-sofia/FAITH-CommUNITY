//db table: admins
import db from "../../database.js"
import bcrypt from "bcrypt"

// Get admin's own profile
export const getAdminProfile = async (req, res) => {
  try {
    const adminId = req.admin.id

    const [rows] = await db.execute(
      `SELECT id, org, orgName, email, role, status, organization_id, 
              created_at
       FROM admins WHERE id = ?`,
      [adminId]
    )

    if (rows.length === 0) {
      return res.status(404).json({ error: "Admin not found" })
    }

    const admin = rows[0]
    
    // Remove sensitive information
    delete admin.password
    
    res.json({
      success: true,
      data: admin
    })
  } catch (err) {
    console.error("Error fetching admin profile:", err)
    res.status(500).json({ error: "Internal server error" })
  }
}

// Update admin's organization profile and email
export const updateAdminProfile = async (req, res) => {
  try {
    const adminId = req.admin.id
    const { org, orgName, email, password } = req.body

    if (!org || !orgName || !email) {
      return res.status(400).json({ error: "Organization acronym, name, and email are required" })
    }

    // Get current admin data to check if there are actual changes
    const [currentAdminRows] = await db.execute(
      "SELECT org, orgName, email FROM admins WHERE id = ?",
      [adminId]
    )

    if (currentAdminRows.length === 0) {
      return res.status(404).json({ error: "Admin not found" })
    }

    const currentAdmin = currentAdminRows[0]
    const hasChanges = currentAdmin.org !== org || 
                      currentAdmin.orgName !== orgName || 
                      currentAdmin.email !== email

    // If there are changes, password is required
    if (hasChanges && !password) {
      return res.status(400).json({ error: "Current password is required to confirm changes" })
    }

    // If there are changes, verify password first
    if (hasChanges) {
      const [adminRows] = await db.execute(
        "SELECT password FROM admins WHERE id = ?",
        [adminId]
      )

      if (adminRows.length === 0) {
        return res.status(404).json({ error: "Admin not found" })
      }

      const isPasswordValid = await bcrypt.compare(password, adminRows[0].password)
      if (!isPasswordValid) {
        return res.status(401).json({ error: "Invalid password" })
      }
    }

    // Check if email is already taken by another admin
    const [existingAdmin] = await db.execute(
      "SELECT id FROM admins WHERE email = ? AND id != ?",
      [email, adminId]
    )

    if (existingAdmin.length > 0) {
      return res.status(409).json({ error: "Email is already taken" })
    }

    // Update admin profile
    await db.execute(
      "UPDATE admins SET org = ?, orgName = ?, email = ? WHERE id = ?",
      [org, orgName, email, adminId]
    )

    res.json({
      success: true,
      message: hasChanges ? "Profile updated successfully" : "Profile saved (no changes detected)",
      data: { org, orgName, email }
    })
  } catch (err) {
    console.error("Error updating admin profile:", err)
    res.status(500).json({ error: "Internal server error" })
  }
}

// Update admin's email
export const updateAdminEmail = async (req, res) => {
  try {
    const adminId = req.admin.id
    const { email, password } = req.body

    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" })
    }

    // Verify current password first
    const [adminRows] = await db.execute(
      "SELECT password FROM admins WHERE id = ?",
      [adminId]
    )

    if (adminRows.length === 0) {
      return res.status(404).json({ error: "Admin not found" })
    }

    const isPasswordValid = await bcrypt.compare(password, adminRows[0].password)
    if (!isPasswordValid) {
      return res.status(401).json({ error: "Invalid password" })
    }

    // Check if email is already taken by another admin
    const [existingAdmin] = await db.execute(
      "SELECT id FROM admins WHERE email = ? AND id != ?",
      [email, adminId]
    )

    if (existingAdmin.length > 0) {
      return res.status(409).json({ error: "Email is already taken" })
    }

    // Update email
    await db.execute(
      "UPDATE admins SET email = ? WHERE id = ?",
      [email, adminId]
    )

    res.json({
      success: true,
      message: "Email updated successfully",
      data: { email }
    })
  } catch (err) {
    console.error("Error updating admin email:", err)
    res.status(500).json({ error: "Internal server error" })
  }
}

// Update admin's password
export const updateAdminPassword = async (req, res) => {
  try {
    const adminId = req.admin.id
    const { currentPassword, newPassword } = req.body

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: "Current and new password are required" })
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: "New password must be at least 6 characters long" })
    }

    // Verify current password
    const [adminRows] = await db.execute(
      "SELECT password FROM admins WHERE id = ?",
      [adminId]
    )

    if (adminRows.length === 0) {
      return res.status(404).json({ error: "Admin not found" })
    }

    const isPasswordValid = await bcrypt.compare(currentPassword, adminRows[0].password)
    if (!isPasswordValid) {
      return res.status(401).json({ error: "Invalid current password" })
    }

    // Hash new password
    const saltRounds = 10
    const hashedPassword = await bcrypt.hash(newPassword, saltRounds)

    // Update password
    await db.execute(
      "UPDATE admins SET password = ? WHERE id = ?",
      [hashedPassword, adminId]
    )

    res.json({
      success: true,
      message: "Password updated successfully"
    })
  } catch (err) {
    console.error("Error updating admin password:", err)
    res.status(500).json({ error: "Internal server error" })
  }
}

// Verify password for email change
export const verifyPasswordForEmailChange = async (req, res) => {
  try {
    const adminId = req.admin.id
    const { password } = req.body

    if (!password) {
      return res.status(400).json({ error: "Password is required" })
    }

    const [adminRows] = await db.execute(
      "SELECT password FROM admins WHERE id = ?",
      [adminId]
    )

    if (adminRows.length === 0) {
      return res.status(404).json({ error: "Admin not found" })
    }

    const isPasswordValid = await bcrypt.compare(password, adminRows[0].password)
    if (!isPasswordValid) {
      return res.status(401).json({ error: "Invalid password" })
    }

    res.json({
      success: true,
      message: "Password verified successfully"
    })
  } catch (err) {
    console.error("Error verifying password:", err)
    res.status(500).json({ error: "Internal server error" })
  }
}

// Verify password for password change
export const verifyPasswordForPasswordChange = async (req, res) => {
  try {
    const adminId = req.admin.id
    const { password } = req.body

    if (!password) {
      return res.status(400).json({ error: "Password is required" })
    }

    const [adminRows] = await db.execute(
      "SELECT password FROM admins WHERE id = ?",
      [adminId]
    )

    if (adminRows.length === 0) {
      return res.status(404).json({ error: "Admin not found" })
    }

    const isPasswordValid = await bcrypt.compare(password, adminRows[0].password)
    if (!isPasswordValid) {
      return res.status(401).json({ error: "Invalid password" })
    }

    res.json({
      success: true,
      message: "Password verified successfully"
    })
  } catch (err) {
    console.error("Error verifying password:", err)
    res.status(500).json({ error: "Internal server error" })
  }
}
