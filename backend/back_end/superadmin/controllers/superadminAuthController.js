// db table: superadmin
import db from "../../database.js"
import bcrypt from "bcrypt"
import jwt from "jsonwebtoken"
import crypto from "crypto"
import { LoginAttemptTracker } from "../../utils/loginAttemptTracker.js"
import { generateTwoFASecret, verifyTwoFAToken, generateTwoFAQRCode, generateSimpleQRCode, validateTwoFATokenFormat } from "../../utils/twoFA.js"

// JWT secret via env
const JWT_SECRET = process.env.JWT_SECRET || "change-me-in-env"

// -------------------- Auth: Login / Verify --------------------

// Superadmin login endpoint
export const loginSuperadmin = async (req, res) => {
  const { email, password, otp } = req.body
  const ipAddress = req.ip || req.connection.remoteAddress

  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required" })
  }

  try {
    // Check failed login attempts
    const failedAttempts = await LoginAttemptTracker.getFailedAttempts(email, ipAddress);
    
    // Block for 5 minutes after 5 failed attempts
    if (failedAttempts >= 5) {
      return res.status(429).json({ 
        error: 'Too many failed login attempts. Please wait 5 minutes before trying again.',
        retryAfter: '5 minutes'
      });
    }
    const [superadminRows] = await db.execute(
      "SELECT id, username, password, twofa_enabled, twofa_secret, created_at, updated_at FROM superadmin WHERE username = ?",
      [email],
    )

    if (superadminRows.length === 0) {
      await LoginAttemptTracker.trackFailedAttempt(email, ipAddress);
      return res.status(401).json({ error: "Invalid credentials" })
    }

    const superadmin = superadminRows[0]
    const isPasswordValid = await bcrypt.compare(password, superadmin.password)
    if (!isPasswordValid) {
      await LoginAttemptTracker.trackFailedAttempt(email, ipAddress);
      return res.status(401).json({ error: "Invalid credentials" })
    }

    // Check if 2FA is enabled and verify token
    if (superadmin.twofa_enabled) {
      if (!otp) {
        return res.status(401).json({ error: "2FA token required", requireTwoFA: true })
      }
      
      if (!validateTwoFATokenFormat(otp)) {
        return res.status(401).json({ error: "Invalid 2FA token format", requireTwoFA: true })
      }
      
      const isValidToken = verifyTwoFAToken(otp, superadmin.twofa_secret || "")
      if (!isValidToken) {
        return res.status(401).json({ error: "Invalid 2FA token", requireTwoFA: true })
      }
    }


    // For the main superadmin account (ID 1), use hardcoded token for compatibility
    // For other superadmin accounts, use JWT tokens
    const token = superadmin.id === 1 ? "superadmin" : jwt.sign(
      { id: superadmin.id, username: superadmin.username, role: "superadmin" },
      JWT_SECRET,
      { 
        expiresIn: "30m",
        issuer: process.env.JWT_ISS || "faith-community",
        audience: process.env.JWT_AUD || "admin"
      },
    )

    // Clear failed login attempts on successful login
    await LoginAttemptTracker.clearFailedAttempts(email, ipAddress);
    
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
    // Handle hardcoded superadmin token
    if (token === "superadmin") {
      req.superadmin = {
        id: 1,
        username: "superadmin@faith.com",
        role: "superadmin"
      }
      next()
      return
    }

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

// -------------------- Email Change --------------------

// Request superadmin email change - Step 1: Password verification and OTP generation
export const requestSuperadminEmailChange = async (req, res) => {
  const { id } = req.params
  const { newEmail, currentPassword, otp } = req.body

  if (!id || isNaN(id)) {
    return res.status(400).json({ error: "Invalid superadmin ID" })
  }

  if (!newEmail || !currentPassword) {
    return res.status(400).json({ error: "New email and current password are required" })
  }

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(newEmail)) {
    return res.status(400).json({ error: "Invalid email format" });
  }

  try {
    const [superadminRows] = await db.execute(
      "SELECT id, username, password FROM superadmin WHERE id = ?",
      [id]
    )

    if (superadminRows.length === 0) {
      return res.status(404).json({ error: "Superadmin not found" })
    }

    const superadmin = superadminRows[0]

    // Check if new email is different from current email
    if (newEmail === superadmin.username) {
      return res.status(400).json({ error: "New email must be different from current email" });
    }

    // Verify current password
    const isPasswordValid = await bcrypt.compare(currentPassword, superadmin.password)
    if (!isPasswordValid) {
      return res.status(401).json({ error: "Invalid password" })
    }


    // Check if email is already taken by another superadmin
    const [existingSuperadmin] = await db.execute(
      "SELECT id FROM superadmin WHERE username = ? AND id != ?",
      [newEmail, id]
    )

    if (existingSuperadmin.length > 0) {
      return res.status(409).json({ error: "Email is already taken" })
    }

    // Create OTP and send verification email
    const { EmailChangeOTP } = await import('../../utils/emailChangeOTP.js');
    
    const result = await EmailChangeOTP.createEmailChangeOTP(
      id, 
      'superadmin', 
      newEmail, 
      superadmin.username, 
      'Superadmin'
    );

    res.json({
      success: true,
      message: "OTP sent to new email address. Please check your email and enter the verification code.",
      token: result.token,
      expiresAt: result.expiresAt
    });

  } catch (err) {
    console.error("Error requesting superadmin email change:", err)
    res.status(500).json({ error: "Internal server error" })
  }
}

// Verify superadmin email change OTP - Step 2: Complete email change
export const verifySuperadminEmailChangeOTP = async (req, res) => {
  const { id } = req.params
  const { token, otp } = req.body

  if (!id || isNaN(id)) {
    return res.status(400).json({ error: "Invalid superadmin ID" })
  }

  if (!token || !otp) {
    return res.status(400).json({ error: "Token and OTP are required" })
  }

  try {
    // Verify OTP
    const { EmailChangeOTP } = await import('../../utils/emailChangeOTP.js');
    const verificationResult = await EmailChangeOTP.verifyOTP(token, otp, id, 'superadmin');

    if (!verificationResult.success) {
      return res.status(400).json({ error: verificationResult.error });
    }

    // Update email in database
    await db.execute(
      "UPDATE superadmin SET username = ?, updated_at = NOW() WHERE id = ?",
      [verificationResult.newEmail, id]
    );

    // Clean up expired OTPs
    await EmailChangeOTP.cleanupExpiredOTPs();

    res.json({
      success: true,
      message: "Email changed successfully",
      data: { email: verificationResult.newEmail }
    });

  } catch (err) {
    console.error("Error verifying superadmin email change OTP:", err)
    res.status(500).json({ error: "Internal server error" })
  }
}

// -------------------- Update Password --------------------

export const updateSuperadminPassword = async (req, res) => {
  const { id } = req.params
  const { currentPassword, newPassword, otp } = req.body

  if (!id || isNaN(id)) {
    return res.status(400).json({ error: "Invalid superadmin ID" })
  }

  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: "Current password and new password are required" })
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

  try {
    const [superadminRows] = await db.execute(
      "SELECT id, password, username FROM superadmin WHERE id = ?",
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


    const saltRounds = 12
    const hashedNewPassword = await bcrypt.hash(newPassword, saltRounds)

    await db.execute("UPDATE superadmin SET password = ?, password_changed_at = NOW(), updated_at = NOW() WHERE id = ?", [
      hashedNewPassword,
      id,
    ])

    // Send password change notification
    try {
      const { PasswordChangeNotification } = await import('../../utils/passwordChangeNotification.js');
      await PasswordChangeNotification.sendPasswordChangeNotification(
        superadmin.username, 
        null, 
        'superadmin'
      );
    } catch (notificationError) {
      console.warn('Failed to send password change notification:', notificationError.message);
      // Continue with success response even if notification fails
    }

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

// -------------------- 2FA (Two-Factor Authentication) Functions --------------------

/**
 * Setup 2FA for superadmin
 * Generates a secret and QR code for authenticator app setup
 */
export const setupTwoFA = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if superadmin exists
    const [rows] = await db.execute('SELECT id, username FROM superadmin WHERE id = ?', [id]);
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Superadmin not found' });
    }

    const superadmin = rows[0];
    
    // Generate 2FA secret and otpauth URL
    const { secret, otpauth } = generateTwoFASecret(superadmin.username);
    
    // Generate QR code (optional - may fail without breaking the flow)
    // Option 1: Use full QR code generation (requires qrcode library)
    const qrCodeDataUrl = await generateTwoFAQRCode(otpauth);
    
    // Option 2: Use simple method (no QR code) - uncomment the line below and comment the line above
    // const qrCodeDataUrl = generateSimpleQRCode(otpauth);
    
    // Store secret temporarily (will be enabled after verification)
    await db.execute('UPDATE superadmin SET twofa_secret = ? WHERE id = ?', [secret, id]);
    
    res.json({
      success: true,
      secret,
      otpauth,
      qrCode: qrCodeDataUrl, // May be null if QR generation failed
      message: qrCodeDataUrl 
        ? 'Add the account to your authenticator app using the secret key or QR code, then enter the 6-digit code to verify'
        : 'Add the account to your authenticator app using the secret key, then enter the 6-digit code to verify'
    });
  } catch (error) {
    console.error('2FA setup error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Verify 2FA setup
 * Verifies the 6-digit code and enables 2FA
 */
export const verifyTwoFA = async (req, res) => {
  try {
    const { id } = req.params;
    const { token } = req.body;
    
    if (!token) {
      return res.status(400).json({ error: '2FA token is required' });
    }
    
    if (!validateTwoFATokenFormat(token)) {
      return res.status(400).json({ error: 'Invalid token format. Please enter a 6-digit number' });
    }
    
    // Get superadmin and secret
    const [rows] = await db.execute('SELECT id, twofa_secret FROM superadmin WHERE id = ?', [id]);
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Superadmin not found' });
    }
    
    const superadmin = rows[0];
    if (!superadmin.twofa_secret) {
      return res.status(400).json({ error: '2FA setup not initiated. Please setup 2FA first' });
    }
    
    // Verify the token
    const isValidToken = verifyTwoFAToken(token, superadmin.twofa_secret);
    if (!isValidToken) {
      return res.status(400).json({ error: 'Invalid 2FA token. Please try again' });
    }
    
    // Enable 2FA
    await db.execute('UPDATE superadmin SET twofa_enabled = 1 WHERE id = ?', [id]);
    
    res.json({
      success: true,
      message: '2FA has been successfully enabled for your account'
    });
  } catch (error) {
    console.error('2FA verification error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Disable 2FA for superadmin
 */
export const disableTwoFA = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if superadmin exists
    const [rows] = await db.execute('SELECT id FROM superadmin WHERE id = ?', [id]);
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Superadmin not found' });
    }
    
    // Disable 2FA and clear secret
    await db.execute('UPDATE superadmin SET twofa_enabled = 0, twofa_secret = NULL WHERE id = ?', [id]);
    
    res.json({
      success: true,
      message: '2FA has been successfully disabled for your account'
    });
  } catch (error) {
    console.error('2FA disable error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};