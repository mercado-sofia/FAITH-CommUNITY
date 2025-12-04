import db from "../../database.js"
import * as bcrypt from "bcrypt"
import jwt from "jsonwebtoken"
import crypto from "crypto"
import { LoginAttemptTracker } from "../../utils/loginAttemptTracker.js"
import { getClientIpAddress } from "../../utils/ipAddressHelper.js"
import { generateTwoFASecret, verifyTwoFAToken, generateTwoFAQRCode, generateSimpleQRCode, validateTwoFATokenFormat } from "../../utils/twoFA.js"
import { logSuperadminAction } from "../../utils/audit.js"
import { logError, logInfo } from "../../utils/logger.js"
import {
  signAccessToken,
  issueRefreshToken,
  getAccessTokenCookieOptions,
  getRefreshCookieOptions,
} from '../../utils/jwt.js';

const JWT_SECRET = process.env.JWT_SECRET || "change-me-in-env"

// -------------------- Auth: Login / Verify --------------------

export const loginSuperadmin = async (req, res) => {
  const { email, password, otp } = req.body
  const ipAddress = getClientIpAddress(req)

  // Log incoming request for debugging
  logInfo('Superadmin login attempt', { 
    context: 'superadmin_auth', 
    email: email,
    hasPassword: !!password,
    hasOtp: !!otp,
    ipAddress 
  });

  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required" })
  }

  const trimmedEmail = email.trim().toLowerCase();

  try {
    const failedAttempts = await LoginAttemptTracker.getFailedAttempts(trimmedEmail, ipAddress, 'superadmin');
    const maxAttempts = LoginAttemptTracker.getMaxAttempts();
    
    if (failedAttempts >= maxAttempts) {
      const remainingSeconds = await LoginAttemptTracker.getLockoutTimeRemaining(trimmedEmail, ipAddress, 'superadmin');
      const remainingMinutes = Math.ceil(remainingSeconds / 60);
      
      return res.status(429).json({ 
        error: `Too many failed login attempts. Please wait ${remainingMinutes} minute${remainingMinutes !== 1 ? 's' : ''} before trying again.`,
        retryAfter: `${remainingMinutes} minutes`,
        remainingSeconds: remainingSeconds,
        attempts: failedAttempts,
        maxAttempts: maxAttempts
      });
    }
    const [superadminRows] = await db.execute(
      "SELECT id, email, password_hash as password, twofa_enabled, twofa_secret, created_at, updated_at FROM users WHERE LOWER(email) = ? AND role = 'superadmin'",
      [trimmedEmail],
    )


    if (superadminRows.length === 0) {
      logInfo('Superadmin login failed - not found', { 
        context: 'superadmin_auth', 
        email: trimmedEmail,
        ipAddress 
      });
      if (process.env.NODE_ENV === 'development') {
        console.error('[loginSuperadmin] Superadmin not found for email:', trimmedEmail);
      }
      await LoginAttemptTracker.trackFailedAttempt(trimmedEmail, ipAddress, 'superadmin');
      const newFailedAttempts = await LoginAttemptTracker.getFailedAttempts(trimmedEmail, ipAddress, 'superadmin');
      const maxAttempts = LoginAttemptTracker.getMaxAttempts();
      return res.status(401).json({ 
        error: "Invalid credentials",
        attempts: newFailedAttempts,
        remainingAttempts: Math.max(0, maxAttempts - newFailedAttempts)
      })
    }

    const superadmin = superadminRows[0]
    
    // Check if password_hash is null or empty
    if (!superadmin.password || superadmin.password.trim() === '') {
      logError('Superadmin login failed - password_hash is null or empty', new Error('Password hash missing'), {
        context: 'superadmin_auth',
        email: trimmedEmail,
        superadminId: superadmin.id
      });
      if (process.env.NODE_ENV === 'development') {
        console.error('[loginSuperadmin] Password hash is null or empty for superadmin ID:', superadmin.id);
      }
      return res.status(500).json({ 
        error: "Account configuration error. Please contact support."
      })
    }
    
    const isPasswordValid = await bcrypt.compare(password, superadmin.password)
    
      if (!isPasswordValid) {
        logInfo('Superadmin login failed - invalid password', { 
          context: 'superadmin_auth', 
          email: trimmedEmail,
          superadminId: superadmin.id,
          ipAddress 
        });
        if (process.env.NODE_ENV === 'development') {
          console.error('[loginSuperadmin] Password comparison failed for superadmin ID:', superadmin.id);
        }
        await LoginAttemptTracker.trackFailedAttempt(trimmedEmail, ipAddress, 'superadmin');
        const newFailedAttempts = await LoginAttemptTracker.getFailedAttempts(trimmedEmail, ipAddress, 'superadmin');
        const maxAttempts = LoginAttemptTracker.getMaxAttempts();
        return res.status(401).json({ 
          error: "Invalid credentials",
          attempts: newFailedAttempts,
          remainingAttempts: Math.max(0, maxAttempts - newFailedAttempts)
        })
      }

    // Check if 2FA is enabled and verify token
    if (superadmin.twofa_enabled) {
      if (!otp) {
        return res.status(401).json({ error: "2FA token required", requireTwoFA: true })
      }
      
      if (!validateTwoFATokenFormat(otp)) {
        await LoginAttemptTracker.trackFailedAttempt(trimmedEmail, ipAddress, 'superadmin');
        const newFailedAttempts = await LoginAttemptTracker.getFailedAttempts(trimmedEmail, ipAddress, 'superadmin');
        const maxAttempts = LoginAttemptTracker.getMaxAttempts();
        return res.status(401).json({ 
          error: "Invalid 2FA token format", 
          requireTwoFA: true,
          attempts: newFailedAttempts,
          remainingAttempts: Math.max(0, maxAttempts - newFailedAttempts)
        })
      }
      
      const isValidToken = verifyTwoFAToken(otp, superadmin.twofa_secret || "")
      if (!isValidToken) {
        await LoginAttemptTracker.trackFailedAttempt(trimmedEmail, ipAddress, 'superadmin');
        const newFailedAttempts = await LoginAttemptTracker.getFailedAttempts(trimmedEmail, ipAddress, 'superadmin');
        const maxAttempts = LoginAttemptTracker.getMaxAttempts();
        return res.status(401).json({ 
          error: "Invalid 2FA token", 
          requireTwoFA: true,
          attempts: newFailedAttempts,
          remainingAttempts: Math.max(0, maxAttempts - newFailedAttempts)
        })
      }
    }


    // Always use JWT tokens (hardcoded token removed for production safety)
    // In development, we can still use hardcoded token for superadmin ID 1, but it's safer to use JWT
    const isProduction = process.env.NODE_ENV === "production";
    const useHardcodedToken = !isProduction && superadmin.id === 1 && process.env.ALLOW_HARDCODED_TOKEN === "true";
    
    const accessToken = useHardcodedToken
      ? "superadmin" 
      : signAccessToken({
          id: superadmin.id,
          email: superadmin.email,
          role: "superadmin"
        })

    // Issue refresh token (works for all roles with unified users table!)
    const { token: refreshToken } = await issueRefreshToken(superadmin.id, {
      userAgent: req.headers['user-agent'],
      ipAddress: getClientIpAddress(req),
    });

    await LoginAttemptTracker.clearFailedAttempts(trimmedEmail, ipAddress, 'superadmin');
    
    await logSuperadminAction(superadmin.id, 'login', 'Superadmin logged in', req)
    
    // Set both tokens as httpOnly cookies (secure!)
    // Pass req to cookie options functions so they can use forwarded host for domain
    res.cookie('access_token', accessToken, getAccessTokenCookieOptions(req))
    res.cookie('refresh_token', refreshToken, getRefreshCookieOptions(req))
    
    res.json({
      message: "Login successful",
      superadmin: {
        id: superadmin.id,
        email: superadmin.email,
        name: "Super Administrator",
        role: "superadmin",
      },
    })
  } catch (err) {
    logError('Superadmin login error', err, { context: 'superadmin_auth', email: req.body?.email });
    res.status(500).json({ 
      error: "Internal server error during login",
      message: process.env.NODE_ENV === 'development' ? err.message : undefined
    })
  }
}

// JWT verification middleware for superadmin
export const verifySuperadminToken = (req, res, next) => {
  // Try cookie first (more secure), then header (for backward compatibility)
  const token = req.cookies?.access_token || req.headers.authorization?.split(" ")[1]

  if (!token) {
    return res.status(401).json({ error: "Access token required" })
  }

  try {
    // Hardcoded superadmin token for development/testing only (disabled in production)
    if (token === "superadmin") {
      if (process.env.NODE_ENV === "production") {
        return res.status(403).json({ error: "Hardcoded token not allowed in production" })
      }
      req.superadmin = {
        id: 1,
        email: "superadmin@faith.com",
        role: "superadmin"
      }
      next()
      return
    }

    const decoded = jwt.verify(token, JWT_SECRET, {
      issuer: process.env.JWT_ISS || "faith-community-api",
      audience: process.env.JWT_AUD || "faith-community-client",
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
    const [rows] = await db.execute(
      "SELECT id, email, created_at, updated_at, password_changed_at FROM users WHERE id = ? AND role = 'superadmin'",
      [id],
    )

    if (rows.length === 0) {
      return res.status(404).json({ message: "Superadmin not found" })
    }

    const superadmin = rows[0]
    res.json({
      id: superadmin.id,
      email: superadmin.email,
      name: "Super Administrator",
      role: "superadmin",
      created_at: superadmin.created_at,
      updated_at: superadmin.updated_at,
      password_changed_at: superadmin.password_changed_at,
    })
  } catch (err) {
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
      "SELECT id, password_hash as password FROM users WHERE id = ? AND role = 'superadmin'",
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
      "SELECT id, email, password_hash as password FROM users WHERE id = ? AND role = 'superadmin'",
      [id]
    )

    if (superadminRows.length === 0) {
      return res.status(404).json({ error: "Superadmin not found" })
    }

    const superadmin = superadminRows[0]

    // Check if new email is different from current email
    if (newEmail === superadmin.email) {
      return res.status(400).json({ error: "New email must be different from current email" });
    }

    // Verify current password
    const isPasswordValid = await bcrypt.compare(currentPassword, superadmin.password)
    if (!isPasswordValid) {
      return res.status(401).json({ error: "Invalid password" })
    }


    // Check if email is already taken by another user
    const [existingSuperadmin] = await db.execute(
      "SELECT id FROM users WHERE email = ? AND id != ?",
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
      superadmin.email, 
      'Superadmin'
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
      "UPDATE users SET email = ?, updated_at = NOW() WHERE id = ? AND role = 'superadmin'",
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
    // Log the actual error for debugging
    logError('Error verifying superadmin email change OTP', err, {
      context: 'superadmin_auth_controller',
      superadminId: id,
      errorStack: err.stack
    });
    
    // Return error message (hide details in production for security)
    const errorMessage = process.env.NODE_ENV === 'development' 
      ? err.message 
      : 'Internal server error';
    
    res.status(500).json({ error: errorMessage });
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
      "SELECT id, password_hash as password, email, twofa_enabled, twofa_secret FROM users WHERE id = ? AND role = 'superadmin'",
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

    const saltRounds = 12
    const hashedNewPassword = await bcrypt.hash(newPassword, saltRounds)

    await db.execute("UPDATE users SET password_hash = ?, password_changed_at = NOW(), updated_at = NOW() WHERE id = ? AND role = 'superadmin'", [
      hashedNewPassword,
      id,
    ])

    // Revoke all existing refresh tokens and clear both cookies (security: force re-login)
    try {
      const { revokeAllUserRefreshTokens } = await import('../../utils/jwt.js');
      await revokeAllUserRefreshTokens(id);
    } catch {}
    // Clear both cookies using the same domain logic as cookie setting
    const { getClearCookieOptions } = await import('../../utils/jwt.js');
    const clearCookieOptions = getClearCookieOptions(req);
    res.clearCookie('access_token', clearCookieOptions);
    res.clearCookie('refresh_token', clearCookieOptions);

    // Send password change notification
    try {
      const { PasswordChangeNotification } = await import('../../utils/passwordChangeNotification.js');
      await PasswordChangeNotification.sendPasswordChangeNotification(
        superadmin.email, 
        null, 
        'superadmin'
      );
    } catch (notificationError) {
      // Continue with success response even if notification fails
    }

    res.json({ 
      message: "Password updated successfully",
      passwordChangedAt: new Date().toISOString()
    })
  } catch (err) {
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
      "SELECT id, email FROM users WHERE email = ? AND role = 'superadmin'",
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

    // URL encode the token to ensure proper handling across all email clients and browsers
    const encodedToken = encodeURIComponent(token);
    const resetLink = `${process.env.FRONTEND_URL || "http://localhost:3000"}/reset-password?token=${encodedToken}&type=superadmin`

    const { sendMail } = await import("../../utils/mailer.js")
    const { getSiteName } = await import("../../utils/siteName.js")
    const siteName = await getSiteName()
    await sendMail({
      to: email,
      subject: `Password Reset Request - ${siteName} Superadmin`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #1A685B 0%, #2D8F7F 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 24px;">${siteName}</h1>
            <p style="color: #E8F5F3; margin: 10px 0 0 0;">Password Reset Request</p>
          </div>
          
          <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px;">
            <h2 style="color: #1A685B; margin-top: 0;">Password Reset Request</h2>
            
            <p>Hello,</p>
            
            <p>You have requested to reset your password for your ${siteName} superadmin account. Click the button below to reset your password:</p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${resetLink}" style="display: inline-block; background: #1A685B; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">Reset Password</a>
            </div>
            
            <p style="color: #666; font-size: 14px; margin-top: 20px;">Or copy and paste this link into your browser:</p>
            <p style="word-break: break-all; color: #666; font-size: 13px; background: white; padding: 12px; border-radius: 6px; border: 1px solid #dee2e6;">${resetLink}</p>
            
            <div style="background: #fff3cd; border: 1px solid #ffeaa7; border-radius: 6px; padding: 15px; margin: 20px 0;">
              <p style="margin: 0; color: #856404; font-size: 14px;"><strong>Important:</strong> This link will expire in 1 hour.</p>
            </div>
            
            <div style="background: #f8d7da; border: 1px solid #f5c6cb; border-radius: 6px; padding: 15px; margin: 20px 0;">
              <p style="margin: 0; color: #721c24; font-size: 14px;"><strong>Security Notice:</strong> If you didn't request this password reset, please ignore this email.</p>
            </div>
            
            <p style="color: #666; font-size: 14px; margin-top: 20px;">
              Best regards,<br><strong>${siteName} Team</strong>
            </p>
          </div>
        </div>
      `,
      text: `Password Reset Request - ${siteName} Superadmin

Hello,

You requested to reset your ${siteName} superadmin password.

Reset link (valid 1 hour):
${resetLink}

If you didn't request this, you can ignore this email.

Best,
${siteName} Team`,
    })

    res.json(genericOk)
  } catch (err) {
    res.status(500).json({ error: "Internal server error while processing password reset request" })
  }
}

// Reset password with token for superadmin
export const resetPasswordSuperadmin = async (req, res) => {
  const { token, newPassword } = req.body

  if (!token || !newPassword) {
    return res.status(400).json({ error: "Token and new password are required" })
  }

  // Validate password requirements (matching frontend)
  if (newPassword.length < 8) {
    return res.status(400).json({ error: "Password must be at least 8 characters long" })
  }
  if (!/(?=.*[a-z])/.test(newPassword)) {
    return res.status(400).json({ error: "Password must contain at least one lowercase letter" })
  }
  if (!/(?=.*[A-Z])/.test(newPassword)) {
    return res.status(400).json({ error: "Password must contain at least one uppercase letter" })
  }
  if (!/(?=.*\d)/.test(newPassword)) {
    return res.status(400).json({ error: "Password must contain at least one number" })
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

    // Update password in unified users table
    await db.execute("UPDATE users SET password_hash = ?, password_changed_at = NOW() WHERE email = ?", [
      hashedPassword,
      email,
    ])

    // Consume token
    await db.execute("DELETE FROM password_reset_tokens WHERE token = ?", [token])

    // Revoke any existing refresh tokens for this user
    try {
      const [sa] = await db.execute('SELECT id FROM users WHERE email = ? AND role = \'superadmin\' LIMIT 1', [email])
      if (sa.length > 0) {
        await db.execute('UPDATE refresh_tokens SET revoked_at = NOW() WHERE user_id = ?', [sa[0].id])
      }
    } catch {}

    const { sendMail } = await import("../../utils/mailer.js")
    const { getSiteName } = await import("../../utils/siteName.js")
    const siteName = await getSiteName()
    await sendMail({
      to: email,
      subject: `Password Successfully Reset - ${siteName}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #1A685B 0%, #2D8F7F 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 24px;">${siteName}</h1>
            <p style="color: #E8F5F3; margin: 10px 0 0 0;">Password Reset Confirmation</p>
          </div>
          
          <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px;">
            <h2 style="color: #1A685B; margin-top: 0;">Password Successfully Reset</h2>
            
            <p>Hello,</p>
            
            <p>Your password has been successfully reset for your ${siteName} superadmin account. You can now log in with your new password.</p>
            
            <div style="background: #d4edda; border: 1px solid #c3e6cb; border-radius: 6px; padding: 15px; margin: 20px 0;">
              <p style="margin: 0; color: #155724; font-size: 14px;"><strong>✓ Success:</strong> Your password has been changed. You may need to log in again on all devices where you're currently signed in.</p>
            </div>
            
            <div style="background: #f8d7da; border: 1px solid #f5c6cb; border-radius: 6px; padding: 15px; margin: 20px 0;">
              <p style="margin: 0; color: #721c24; font-size: 14px;"><strong>Security Alert:</strong> If you didn't request this password reset, please contact our support team immediately as your account may be compromised.</p>
            </div>
            
            <p style="color: #666; font-size: 14px; margin-top: 20px;">
              Best regards,<br><strong>${siteName} Team</strong>
            </p>
          </div>
        </div>
      `,
      text: `Your ${siteName} password was successfully reset. If this wasn't you, contact support immediately.`,
    })

    res.json({ message: "Password has been successfully reset" })
  } catch (err) {
    logError('Error resetting password (superadmin)', err, { 
      context: 'superadminAuthController', 
      email: req.body.token ? 'token provided' : 'no token',
      error: err.message 
    })
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
      "SELECT id FROM users WHERE email = ? AND role = 'superadmin'",
      [email],
    )

    if (superadminRows.length > 0) {
      res.json({ exists: true })
    } else {
      res.status(404).json({ exists: false })
    }
  } catch (err) {
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
    const [superadminRows] = await db.execute("SELECT id FROM users WHERE id = ? AND role = 'superadmin'", [id])
    if (superadminRows.length === 0) {
      return res.status(404).json({ error: "Superadmin not found" })
    }

    const [existingEmailRows] = await db.execute(
      "SELECT id FROM users WHERE email = ? AND id != ?",
      [newEmail, id],
    )
    if (existingEmailRows.length > 0) {
      return res.status(409).json({ error: "Email address is already in use" })
    }

    await db.execute("UPDATE users SET email = ?, updated_at = NOW() WHERE id = ? AND role = 'superadmin'", [
      newEmail,
      id,
    ])

    res.json({
      message: "Email updated successfully",
      email: newEmail,
    })
  } catch (err) {
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
    const [rows] = await db.execute('SELECT id, email FROM users WHERE id = ? AND role = \'superadmin\'', [id]);
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Superadmin not found' });
    }

    const superadmin = rows[0];
    
    // Generate 2FA secret and otpauth URL
    const { secret, otpauth } = generateTwoFASecret(superadmin.email);
    
    // Generate QR code (optional - may fail without breaking the flow)
    const qrCodeDataUrl = await generateTwoFAQRCode(otpauth);
    
    // Store secret temporarily (will be enabled after verification)
    await db.execute('UPDATE users SET twofa_secret = ? WHERE id = ? AND role = \'superadmin\'', [secret, id]);
    
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
    const [rows] = await db.execute('SELECT id, twofa_secret FROM users WHERE id = ? AND role = \'superadmin\'', [id]);
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
    await db.execute('UPDATE users SET twofa_enabled = 1 WHERE id = ? AND role = \'superadmin\'', [id]);
    
    res.json({
      success: true,
      message: '2FA has been successfully enabled for your account'
    });
  } catch (error) {
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
    const [rows] = await db.execute('SELECT id FROM users WHERE id = ? AND role = \'superadmin\'', [id]);
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Superadmin not found' });
    }
    
    // Disable 2FA and clear secret
    await db.execute('UPDATE users SET twofa_enabled = 0, twofa_secret = NULL WHERE id = ? AND role = \'superadmin\'', [id]);
    
    res.json({
      success: true,
      message: '2FA has been successfully disabled for your account'
    });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Initialize/Reset superadmin account (Production only, protected by secret key)
 * Usage: POST /api/superadmin/auth/initialize
 * Body: { secretKey: "your-secret-key" }
 */
export const initializeSuperadmin = async (req, res) => {
  try {
    const { secretKey } = req.body;
    
    const requiredSecretKey = process.env.SUPERADMIN_INIT_SECRET || process.env.JWT_SECRET;
    
    if (!requiredSecretKey) {
      logError('SUPERADMIN_INIT_SECRET or JWT_SECRET not set in environment', new Error('Missing secret'), { context: 'superadmin' });
      return res.status(500).json({ 
        error: 'Server configuration error: Initialization secret not configured' 
      });
    }
    
    if (!secretKey || secretKey !== requiredSecretKey) {
      logError('Invalid secret key for superadmin initialization', new Error('Unauthorized'), { 
        context: 'superadmin',
        ip: getClientIpAddress(req)
      });
      return res.status(401).json({ 
        error: 'Invalid secret key' 
      });
    }
    
    const superadminEmail = 'faithcommunityfaces@gmail.com';
    const superadminPassword = 'admin123';
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(superadminPassword, saltRounds);
    
    const [existing] = await db.execute(
      'SELECT id, email, password_hash FROM users WHERE id = 1 AND role = \'superadmin\''
    );
    
    if (existing.length === 0) {
      await db.execute(
        `INSERT INTO users (id, email, password_hash, role, password_changed_at, twofa_enabled, twofa_secret, created_at, updated_at)
         VALUES (1, ?, ?, 'superadmin', NOW(), FALSE, NULL, NOW(), NOW())`,
        [superadminEmail, hashedPassword]
      );
      
      const ipAddress = getClientIpAddress(req);
      await LoginAttemptTracker.clearFailedAttempts(superadminEmail, ipAddress, 'superadmin');
      
      logInfo('Superadmin account created via initialization endpoint', {
        context: 'superadmin',
        email: superadminEmail,
        ip: ipAddress
      });
      
      res.json({
        success: true,
        message: 'Superadmin account created successfully',
        email: superadminEmail,
        password: superadminPassword,
        warning: 'Please change the password after first login!',
        note: 'All failed login attempts have been cleared. You can now log in immediately.'
      });
    } else {
      const existingAccount = existing[0];
      
      await db.execute(
        `UPDATE users 
         SET email = ?, password_hash = ?, password_changed_at = NOW(), updated_at = NOW(), twofa_enabled = FALSE, twofa_secret = NULL
         WHERE id = 1 AND role = 'superadmin'`,
        [superadminEmail, hashedPassword]
      );
      
      const ipAddress = getClientIpAddress(req);
      await LoginAttemptTracker.clearFailedAttempts(superadminEmail, ipAddress, 'superadmin');
      await db.execute(
        'DELETE FROM login_attempts WHERE ip_address = ? AND attempt_type = ?',
        [ipAddress, 'failed']
      );
      
      logInfo('Superadmin account reset via initialization endpoint', {
        context: 'superadmin',
        email: superadminEmail,
        previousEmail: existingAccount.email,
        ip: ipAddress
      });
      
      res.json({
        success: true,
        message: 'Superadmin account reset successfully',
        email: superadminEmail,
        password: superadminPassword,
        warning: 'Please change the password after first login!',
        note: 'All failed login attempts have been cleared. You can now log in immediately.'
      });
    }
  } catch (error) {
    logError('Failed to initialize superadmin account', error, {
      context: 'superadmin',
      ip: getClientIpAddress(req)
    });
    res.status(500).json({ 
      error: 'Internal server error while initializing superadmin account' 
    });
  }
};