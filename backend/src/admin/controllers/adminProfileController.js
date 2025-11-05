//db table: admins
import db from "../../database.js"
import * as bcrypt from "bcrypt"
import jwt from "jsonwebtoken"

// JWT secret for admin (should match the one used in admin login)
const JWT_SECRET = process.env.JWT_SECRET

// Get admin's own profile
export const getAdminProfile = async (req, res) => {
  try {
    const adminId = req.admin.id

    const [rows] = await db.execute(
      `SELECT a.id, a.email, a.is_active, a.organization_id, a.created_at, a.password_changed_at,
              o.org, o.orgName
       FROM admins a
       LEFT JOIN organizations o ON a.organization_id = o.id
       WHERE a.id = ?`,
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
    res.status(500).json({ error: "Internal server error" })
  }
}

// Update admin's email only (org/orgName are now managed through organization controller)
export const updateAdminProfile = async (req, res) => {
  try {
    const adminId = req.admin.id
    const { email, password } = req.body

    if (!email) {
      return res.status(400).json({ error: "Email is required" })
    }

    // Get current admin data to check if there are actual changes
    const [currentAdminRows] = await db.execute(
      "SELECT email FROM admins WHERE id = ?",
      [adminId]
    )

    if (currentAdminRows.length === 0) {
      return res.status(404).json({ error: "Admin not found" })
    }

    const currentAdmin = currentAdminRows[0]
    const hasChanges = currentAdmin.email !== email

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

    // Update admin email only
    await db.execute(
      "UPDATE admins SET email = ? WHERE id = ?",
      [email, adminId]
    )

    res.json({
      success: true,
      message: hasChanges ? "Email updated successfully" : "Email saved (no changes detected)",
      data: { email }
    })
  } catch (err) {
    res.status(500).json({ error: "Internal server error" })
  }
}

// Request admin email change - Step 1: Password verification and OTP generation
export const requestAdminEmailChange = async (req, res) => {
  try {
    const adminId = req.admin.id
    const { newEmail, currentPassword } = req.body

    if (!newEmail || !currentPassword) {
      return res.status(400).json({ error: "New email and current password are required" })
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newEmail)) {
      return res.status(400).json({ error: "Invalid email format" });
    }

    // Get current admin data
    const [adminRows] = await db.execute(
      "SELECT email, password FROM admins WHERE id = ?",
      [adminId]
    )

    if (adminRows.length === 0) {
      return res.status(404).json({ error: "Admin not found" })
    }

    const admin = adminRows[0];

    // Check if new email is different from current email
    if (newEmail === admin.email) {
      return res.status(400).json({ error: "New email must be different from current email" });
    }

    // Verify current password
    const isPasswordValid = await bcrypt.compare(currentPassword, admin.password)
    if (!isPasswordValid) {
      return res.status(401).json({ error: "Invalid password" })
    }

    // Check if email is already taken by another admin
    const [existingAdmin] = await db.execute(
      "SELECT id FROM admins WHERE email = ? AND id != ?",
      [newEmail, adminId]
    )

    if (existingAdmin.length > 0) {
      return res.status(409).json({ error: "Email is already taken" })
    }

    // Create OTP and send verification email
    const { EmailChangeOTP } = await import('../../utils/emailChangeOTP.js');
    
    const result = await EmailChangeOTP.createEmailChangeOTP(
      adminId, 
      'admin', 
      newEmail, 
      admin.email, 
      'Admin'
    );

    res.json({
      success: true,
      message: "OTP sent to new email address. Please check your email and enter the verification code.",
      token: result.token,
      expiresAt: result.expiresAt
    });

  } catch (err) {
    res.status(500).json({ error: "Internal server error" })
  }
}

// Verify admin email change OTP - Step 2: Complete email change
export const verifyAdminEmailChangeOTP = async (req, res) => {
  try {
    const adminId = req.admin.id
    const { token, otp } = req.body

    if (!token || !otp) {
      return res.status(400).json({ error: "Token and OTP are required" })
    }

    // Verify OTP
    const { EmailChangeOTP } = await import('../../utils/emailChangeOTP.js');
    const verificationResult = await EmailChangeOTP.verifyOTP(token, otp, adminId, 'admin');

    if (!verificationResult.success) {
      return res.status(400).json({ error: verificationResult.error });
    }

    // Update email in database
    await db.execute(
      "UPDATE admins SET email = ? WHERE id = ?",
      [verificationResult.newEmail, adminId]
    );

    // Get updated admin data for new token
    const [updatedAdminRows] = await db.execute(
      `SELECT a.id, a.email, a.role, a.is_active, a.organization_id,
              o.org, o.orgName, o.logo
       FROM admins a
       LEFT JOIN organizations o ON a.organization_id = o.id
       WHERE a.id = ?`,
      [adminId]
    );

    if (updatedAdminRows.length === 0) {
      return res.status(404).json({ error: "Admin not found after email update" });
    }

    const updatedAdmin = updatedAdminRows[0];

    // Generate new JWT token with updated email
    const newJwtToken = jwt.sign(
      {
        id: updatedAdmin.id,
        email: updatedAdmin.email,
        role: updatedAdmin.role,
        organization_id: updatedAdmin.organization_id,
        org: updatedAdmin.org,
        orgName: updatedAdmin.orgName,
      },
      JWT_SECRET,
      { 
        expiresIn: "30m",
        issuer: process.env.JWT_ISS || "faith-community-api",
        audience: process.env.JWT_AUD || "faith-community-client"
      },
    );

    // Clean up expired OTPs
    await EmailChangeOTP.cleanupExpiredOTPs();

    res.json({
      success: true,
      message: "Email changed successfully",
      data: { 
        email: verificationResult.newEmail,
        token: newJwtToken,
        admin: {
          id: updatedAdmin.id,
          organization_id: updatedAdmin.organization_id,
          org: updatedAdmin.org,
          orgName: updatedAdmin.orgName,
          logo: updatedAdmin.logo,
          email: updatedAdmin.email,
          role: updatedAdmin.role,
          status: updatedAdmin.is_active ? "ACTIVE" : "INACTIVE",
        }
      }
    });

  } catch (err) {
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

    // Enhanced password complexity validation
    if (newPassword.length < 8) {
      return res.status(400).json({ error: "Password must be at least 8 characters long" })
    }

    if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(newPassword)) {
      return res.status(400).json({ 
        error: "Password must contain at least one uppercase letter, one lowercase letter, and one number" 
      })
    }

    // Verify current password and get admin details
    const [adminRows] = await db.execute(
      "SELECT password, email FROM admins WHERE id = ? AND is_active = TRUE",
      [adminId]
    )

    if (adminRows.length === 0) {
      return res.status(404).json({ error: "Admin not found or inactive" })
    }

    const isPasswordValid = await bcrypt.compare(currentPassword, adminRows[0].password)
    if (!isPasswordValid) {
      return res.status(401).json({ error: "Invalid current password" })
    }

    // Hash new password
    const saltRounds = 12
    const hashedPassword = await bcrypt.hash(newPassword, saltRounds)

    // Update password
    await db.execute(
      "UPDATE admins SET password = ?, password_changed_at = NOW(), updated_at = NOW() WHERE id = ?",
      [hashedPassword, adminId]
    )

    // Send password change notification
    try {
      const { PasswordChangeNotification } = await import('../../utils/passwordChangeNotification.js');
      await PasswordChangeNotification.sendPasswordChangeNotification(
        adminRows[0].email, 
        null, // Admins don't have first_name/last_name
        'admin'
      );
    } catch (notificationError) {
      // Continue with success response even if notification fails
    }

    res.json({
      success: true,
      message: "Password updated successfully"
    })
  } catch (err) {
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
    res.status(500).json({ error: "Internal server error" })
  }
}