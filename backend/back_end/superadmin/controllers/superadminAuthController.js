// db table: superadmin
import db from "../../database.js"
import bcrypt from "bcrypt"
import jwt from "jsonwebtoken"
import crypto from "crypto"


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

// Forgot password - send reset email for superadmin
export const forgotPasswordSuperadmin = async (req, res) => {
  const { email } = req.body

  if (!email || !email.trim()) {
    return res.status(400).json({ error: "Email is required" })
  }

  try {
    // Check if superadmin exists with this username (email)
    const [superadminRows] = await db.execute(
      'SELECT id, username FROM superadmin WHERE username = ?',
      [email]
    )

    if (superadminRows.length === 0) {
      // Don't reveal if email exists or not for security
      return res.json({ message: "If an account with that email exists, a password reset link has been sent." })
    }

    // Generate reset token
    const token = crypto.randomBytes(32).toString('hex')
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000) // 1 hour from now

    // Store token in password_reset_tokens table
    await db.execute(
      'INSERT INTO password_reset_tokens (email, token, expires_at) VALUES (?, ?, ?)',
      [email, token, expiresAt]
    )

    // Send email with reset link
    const resetLink = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password?token=${token}&type=superadmin`
    
    const { sendMail } = await import('../../utils/mailer.js')
    
    await sendMail({
      to: email,
      subject: "Password Reset Request - FAITH CommUNITY Superadmin",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #1A685B;">Password Reset Request</h2>
          <p>Hello,</p>
          <p>You have requested to reset your password for your FAITH CommUNITY superadmin account.</p>
          <p>Click the button below to reset your password:</p>
          <a href="${resetLink}" style="display: inline-block; background: #1A685B; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0;">Reset Password</a>
          <p>This link will expire in 1 hour.</p>
          <p>If you didn't request this password reset, please ignore this email.</p>
          <p>Best regards,<br>FAITH CommUNITY Team</p>
        </div>
      `,
      text: `Password Reset Request - FAITH CommUNITY Superadmin\n\nHello,\n\nYou have requested to reset your password for your FAITH CommUNITY superadmin account.\n\nClick the following link to reset your password:\n${resetLink}\n\nThis link will expire in 1 hour.\n\nIf you didn't request this password reset, please ignore this email.\n\nBest regards,\nFAITH CommUNITY Team`
    })

    res.json({ message: "If an account with that email exists, a password reset link has been sent." })
  } catch (err) {
    console.error("Superadmin forgot password error:", err)
    res.status(500).json({ error: "Internal server error while processing password reset request" })
  }
}

// Reset password with token for superadmin
export const resetPasswordSuperadmin = async (req, res) => {
  const { token, newPassword } = req.body

  if (!token || !newPassword) {
    return res.status(400).json({ error: "Token and new password are required" })
  }

  if (newPassword.length < 6) {
    return res.status(400).json({ error: "Password must be at least 6 characters long" })
  }

  try {
    // Find valid token
    const [tokenRows] = await db.execute(
      'SELECT email, expires_at FROM password_reset_tokens WHERE token = ? AND expires_at > NOW()',
      [token]
    )

    if (tokenRows.length === 0) {
      return res.status(400).json({ error: "Invalid or expired reset token" })
    }

    const tokenData = tokenRows[0]

    // Hash new password
    const saltRounds = 10
    const hashedPassword = await bcrypt.hash(newPassword, saltRounds)

    // Update superadmin password
    await db.execute(
      'UPDATE superadmin SET password = ? WHERE username = ?',
      [hashedPassword, tokenData.email]
    )

    // Also update admin password if email exists there
    await db.execute(
      'UPDATE admins SET password = ? WHERE email = ? AND status = "ACTIVE"',
      [hashedPassword, tokenData.email]
    )

    // Also update user password if email exists there
    await db.execute(
      'UPDATE users SET password_hash = ? WHERE email = ?',
      [hashedPassword, tokenData.email]
    )

    // Delete used token
    await db.execute(
      'DELETE FROM password_reset_tokens WHERE token = ?',
      [token]
    )

    // Send confirmation email
    const { sendMail } = await import('../../utils/mailer.js')
    
    await sendMail({
      to: tokenData.email,
      subject: "Password Successfully Reset - FAITH CommUNITY",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #1A685B;">Password Successfully Reset</h2>
          <p>Hello,</p>
          <p>Your password has been successfully reset for your FAITH CommUNITY account.</p>
          <p>You can now log in with your new password.</p>
          <p>If you didn't request this password reset, please contact support immediately.</p>
          <p>Best regards,<br>FAITH CommUNITY Team</p>
        </div>
      `,
      text: `Password Successfully Reset - FAITH CommUNITY\n\nHello,\n\nYour password has been successfully reset for your FAITH CommUNITY account.\n\nYou can now log in with your new password.\n\nIf you didn't request this password reset, please contact support immediately.\n\nBest regards,\nFAITH CommUNITY Team`
    })

    res.json({ message: "Password has been successfully reset" })
  } catch (err) {
    console.error("Superadmin reset password error:", err)
    res.status(500).json({ error: "Internal server error while resetting password" })
  }
}

// Validate reset token without using it
export const validateResetToken = async (req, res) => {
  const { token } = req.body

  if (!token) {
    return res.status(400).json({ error: "Token is required" })
  }

  try {
    // Check if token exists and is not expired
    const [tokenRows] = await db.execute(
      'SELECT email, expires_at FROM password_reset_tokens WHERE token = ? AND expires_at > NOW()',
      [token]
    )

    if (tokenRows.length === 0) {
      return res.status(400).json({ error: "Invalid or expired reset token" })
    }

    res.json({ message: "Token is valid" })
  } catch (err) {
    console.error("Validate reset token error:", err)
    res.status(500).json({ error: "Internal server error while validating token" })
  }
}

// Check if email exists in superadmin system
export const checkEmailSuperadmin = async (req, res) => {
  const { email } = req.body

  if (!email || !email.trim()) {
    return res.status(400).json({ error: "Email is required" })
  }

  try {
    const [superadminRows] = await db.execute(
      'SELECT id FROM superadmin WHERE username = ?',
      [email]
    )

    if (superadminRows.length > 0) {
      res.json({ exists: true })
    } else {
      res.status(404).json({ exists: false })
    }
  } catch (err) {
    console.error("Superadmin check email error:", err)
    res.status(500).json({ error: "Internal server error" })
  }
}
