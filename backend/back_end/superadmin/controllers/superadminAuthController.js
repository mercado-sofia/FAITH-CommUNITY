// db table: superadmin
import db from "../../database.js"
import bcrypt from "bcrypt"
import jwt from "jsonwebtoken"
import crypto from "crypto"
import { authenticator } from "otplib"

// JWT secret via env
const JWT_SECRET = process.env.JWT_SECRET || "change-me-in-env"

// -------------------- Auth: Login / Verify --------------------

// Superadmin login endpoint
export const loginSuperadmin = async (req, res) => {
  const { email, password, otp } = req.body

  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required" })
  }

  try {
    const [superadminRows] = await db.execute(
      "SELECT id, username, password, mfa_enabled, mfa_secret, created_at, updated_at FROM superadmin WHERE username = ?",
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

    // Enforce TOTP if enabled
    if (superadmin.mfa_enabled) {
      if (!otp) {
        return res.status(401).json({ error: "OTP required", requireMfa: true })
      }
      const isValidOtp = authenticator.check(String(otp), superadmin.mfa_secret || "")
      if (!isValidOtp) {
        return res.status(401).json({ error: "Invalid OTP", requireMfa: true })
      }
    }

    const token = jwt.sign(
      { id: superadmin.id, username: superadmin.username, role: "superadmin" },
      JWT_SECRET,
      { 
        expiresIn: "30m",
        issuer: process.env.JWT_ISS || "faith-community",
        audience: process.env.JWT_AUD || "admin"
      },
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
    const decoded = jwt.verify(token, JWT_SECRET, {
      issuer: process.env.JWT_ISS || "faith-community",
      audience: process.env.JWT_AUD || "admin",
    })
    req.superadmin = decoded
    next()
  } catch (error) {
    return res.status(403).json({ error: "Invalid or expired token" })
  }
}

// -------------------- Profile --------------------

export const getSuperadminProfile = async (req, res) => {
  const { id } = req.params

  if (!id || isNaN(id)) {
    return res.status(400).json({ error: "Invalid superadmin ID" })
  }

  try {
    // Ensure password_changed_at column exists
    try { await db.execute(`ALTER TABLE superadmin ADD COLUMN password_changed_at TIMESTAMP NULL DEFAULT NULL`) } catch {}
    try { await db.execute(`ALTER TABLE superadmin ADD COLUMN mfa_secret VARCHAR(255) NULL`) } catch {}
    try { await db.execute(`ALTER TABLE superadmin ADD COLUMN mfa_enabled TINYINT(1) DEFAULT 0`) } catch {}

    const [rows] = await db.execute(
      "SELECT id, username, created_at, updated_at, password_changed_at FROM superadmin WHERE id = ?",
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
      password_changed_at: superadmin.password_changed_at,
    })
  } catch (err) {
    console.error("Get superadmin profile error:", err)
    res.status(500).json({ error: "Internal server error while fetching profile" })
  }
}

// -------------------- Password Verification --------------------

export const verifySuperadminPassword = async (req, res) => {
  const { id } = req.params
  const { password } = req.body

  if (!id || isNaN(id)) {
    return res.status(400).json({ error: "Invalid superadmin ID" })
  }

  if (!password || password.trim() === "") {
    return res.status(400).json({ error: "Password is required" })
  }

  try {
    // Get superadmin data including hashed password
    const [superadminRows] = await db.execute(
      "SELECT id, password FROM superadmin WHERE id = ?",
      [id]
    )

    if (superadminRows.length === 0) {
      return res.status(404).json({ error: "Superadmin not found" })
    }

    const superadmin = superadminRows[0]

    // Verify the current password
    const isPasswordValid = await bcrypt.compare(password, superadmin.password)

    if (!isPasswordValid) {
      return res.status(401).json({ error: "Invalid password" })
    }

    res.json({
      success: true,
      message: "Password verified successfully"
    })
  } catch (err) {
    console.error("Superadmin password verification error:", err)
    res.status(500).json({ error: "Internal server error during password verification" })
  }
}

// -------------------- Update Password --------------------

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
    const [superadminRows] = await db.execute(
      "SELECT id, password FROM superadmin WHERE id = ?",
      [id],
    )

    if (superadminRows.length === 0) {
      return res.status(404).json({ error: "Superadmin not found" })
    }

    const superadmin = superadminRows[0]

    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, superadmin.password)
    if (!isCurrentPasswordValid) {
      return res.status(401).json({ error: "Current password is incorrect" })
    }

    const saltRounds = 10
    const hashedNewPassword = await bcrypt.hash(newPassword, saltRounds)

    await db.execute("UPDATE superadmin SET password = ?, password_changed_at = NOW(), updated_at = NOW() WHERE id = ?", [
      hashedNewPassword,
      id,
    ])

    res.json({ 
      message: "Password updated successfully",
      passwordChangedAt: new Date().toISOString()
    })
  } catch (err) {
    console.error("Update superadmin password error:", err)
    res.status(500).json({ error: "Internal server error while updating password" })
  }
}

// -------------------- Forgot / Reset Password (Superadmin) --------------------

// Forgot password - send reset email for superadmin
export const forgotPasswordSuperadmin = async (req, res) => {
  const { email } = req.body

  if (!email || !email.trim()) {
    return res.status(400).json({ error: "Email is required" })
  }

  try {
    const [superadminRows] = await db.execute(
      "SELECT id, username FROM superadmin WHERE username = ?",
      [email],
    )

    // Always respond the same to avoid enumeration
    const genericOk = { message: "If an account with that email exists, a password reset link has been sent." }

    if (superadminRows.length === 0) {
      return res.json(genericOk)
    }

    const token = crypto.randomBytes(32).toString("hex")
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000) // 1 hour

    await db.execute(
      "INSERT INTO password_reset_tokens (email, token, expires_at) VALUES (?, ?, ?)",
      [email, token, expiresAt],
    )

    const resetLink = `${process.env.FRONTEND_URL || "http://localhost:3000"}/reset-password?token=${token}&type=superadmin`

    const { sendMail } = await import("../../utils/mailer.js")
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
      text: `Password Reset Request - FAITH CommUNITY Superadmin

Hello,

You requested to reset your FAITH CommUNITY superadmin password.

Reset link (valid 1 hour):
${resetLink}

If you didn't request this, you can ignore this email.

Best,
FAITH CommUNITY Team`,
    })

    res.json(genericOk)
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
    const [tokenRows] = await db.execute(
      "SELECT email, expires_at FROM password_reset_tokens WHERE token = ? AND expires_at > NOW()",
      [token],
    )

    if (tokenRows.length === 0) {
      return res.status(400).json({ error: "Invalid or expired reset token" })
    }

    const { email } = tokenRows[0]

    const saltRounds = 10
    const hashedPassword = await bcrypt.hash(newPassword, saltRounds)

    // Update superadmin (username is the email)
    await db.execute("UPDATE superadmin SET password = ? WHERE username = ?", [
      hashedPassword,
      email,
    ])

    // Also update admins (if applicable)
    await db.execute(
      'UPDATE admins SET password = ? WHERE email = ? AND is_active = TRUE',
      [hashedPassword, email],
    )

    // Also update users (if applicable)
    await db.execute("UPDATE users SET password_hash = ? WHERE email = ?", [
      hashedPassword,
      email,
    ])

    // Consume token
    await db.execute("DELETE FROM password_reset_tokens WHERE token = ?", [token])

    // Revoke any existing refresh tokens for this user across roles (if using shared refresh mechanism)
    try {
      const [sa] = await db.execute('SELECT id FROM superadmin WHERE username = ? LIMIT 1', [email])
      if (sa.length > 0) {
        await db.execute('UPDATE refresh_tokens SET revoked_at = NOW() WHERE user_id = ?', [sa[0].id])
      }
    } catch {}

    const { sendMail } = await import("../../utils/mailer.js")
    await sendMail({
      to: email,
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
      text: `Your FAITH CommUNITY password was successfully reset. If this wasn't you, contact support immediately.`,
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
    const [tokenRows] = await db.execute(
      "SELECT email, expires_at FROM password_reset_tokens WHERE token = ? AND expires_at > NOW()",
      [token],
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
      "SELECT id FROM superadmin WHERE username = ?",
      [email],
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

// -------------------- MFA (TOTP) Setup/Verify/Disable --------------------

export const setupMfaSuperadmin = async (req, res) => {
  try {
    const { id } = req.params
    const [rows] = await db.execute('SELECT id, username FROM superadmin WHERE id = ?', [id])
    if (rows.length === 0) return res.status(404).json({ error: 'Superadmin not found' })

    const secret = authenticator.generateSecret()
    const label = encodeURIComponent(`FAITH-CommUNITY:superadmin-${rows[0].username}`)
    const issuer = encodeURIComponent(process.env.TOTP_ISSUER || 'FAITH-CommUNITY')
    const otpauth = `otpauth://totp/${label}?secret=${secret}&issuer=${issuer}`

    // Temporarily store secret until verified
    await db.execute('UPDATE superadmin SET mfa_secret = ? WHERE id = ?', [secret, id])
    res.json({ otpauth, secret })
  } catch (e) {
    console.error('MFA setup error:', e)
    res.status(500).json({ error: 'Internal server error' })
  }
}

export const verifyMfaSuperadmin = async (req, res) => {
  try {
    const { id } = req.params
    const { otp } = req.body
    const [rows] = await db.execute('SELECT id, mfa_secret FROM superadmin WHERE id = ?', [id])
    if (rows.length === 0) return res.status(404).json({ error: 'Superadmin not found' })
    const secret = rows[0].mfa_secret || ''
    if (!secret) return res.status(400).json({ error: 'MFA not in setup' })
    const ok = authenticator.check(String(otp || ''), secret)
    if (!ok) return res.status(400).json({ error: 'Invalid OTP' })
    await db.execute('UPDATE superadmin SET mfa_enabled = 1 WHERE id = ?', [id])
    res.json({ message: 'MFA enabled' })
  } catch (e) {
    console.error('MFA verify error:', e)
    res.status(500).json({ error: 'Internal server error' })
  }
}

export const disableMfaSuperadmin = async (req, res) => {
  try {
    const { id } = req.params
    await db.execute('UPDATE superadmin SET mfa_enabled = 0, mfa_secret = NULL WHERE id = ?', [id])
    res.json({ message: 'MFA disabled' })
  } catch (e) {
    console.error('MFA disable error:', e)
    res.status(500).json({ error: 'Internal server error' })
  }
}

// -------------------- Update Email (Username) --------------------

export const updateSuperadminEmail = async (req, res) => {
  const { id } = req.params
  const { newEmail } = req.body

  if (!id || isNaN(id)) {
    return res.status(400).json({ error: "Invalid superadmin ID" })
  }

  if (!newEmail || !newEmail.trim()) {
    return res.status(400).json({ error: "New email is required" })
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(newEmail)) {
    return res.status(400).json({ error: "Invalid email format" })
  }

  try {
    const [superadminRows] = await db.execute("SELECT id FROM superadmin WHERE id = ?", [id])
    if (superadminRows.length === 0) {
      return res.status(404).json({ error: "Superadmin not found" })
    }

    const [existingEmailRows] = await db.execute(
      "SELECT id FROM superadmin WHERE username = ? AND id != ?",
      [newEmail, id],
    )
    if (existingEmailRows.length > 0) {
      return res.status(409).json({ error: "Email address is already in use" })
    }

    await db.execute("UPDATE superadmin SET username = ?, updated_at = NOW() WHERE id = ?", [
      newEmail,
      id,
    ])

    res.json({
      message: "Email updated successfully",
      email: newEmail,
    })
  } catch (err) {
    console.error("Update superadmin email error:", err)
    res.status(500).json({ error: "Internal server error while updating email" })
  }
}