// db table: users (unified table for all roles)
import db from "../../database.js"
import * as bcrypt from "bcrypt"
import jwt from "jsonwebtoken"
import { authenticator } from "otplib"
import { logAdminAction, logSuperadminAction } from "../../utils/audit.js"
import { SessionSecurity } from "../../utils/sessionSecurity.js"
import { LoginAttemptTracker } from "../../utils/loginAttemptTracker.js"
import { getClientIpAddress } from "../../utils/ipAddressHelper.js"
import { logError } from "../../utils/logger.js"
import {
  signAccessToken,
  issueRefreshToken,
  getAccessTokenCookieOptions,
  getRefreshCookieOptions,
} from '../../utils/jwt.js';

// JWT secret via env
const JWT_SECRET = process.env.JWT_SECRET || "change-me-in-env"

// Admin login endpoint
export const loginAdmin = async (req, res) => {
  const { email, password, otp } = req.body
  const ipAddress = getClientIpAddress(req)

  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required" })
  }

  try {
    const failedAttempts = await LoginAttemptTracker.getFailedAttempts(email, ipAddress, 'admin');
    const maxAttempts = LoginAttemptTracker.getMaxAttempts();
    
    if (failedAttempts >= maxAttempts) {
      const remainingSeconds = await LoginAttemptTracker.getLockoutTimeRemaining(email, ipAddress, 'admin');
      const remainingMinutes = Math.ceil(remainingSeconds / 60);
      
      return res.status(429).json({ 
        error: `Too many failed login attempts. Please wait ${remainingMinutes} minute${remainingMinutes !== 1 ? 's' : ''} before trying again.`,
        retryAfter: `${remainingMinutes} minutes`,
        remainingSeconds: remainingSeconds,
        attempts: failedAttempts,
        maxAttempts: maxAttempts
      });
    }
    const [adminRows] = await db.execute(
      `SELECT u.id, u.email, u.password_hash as password, u.is_active, u.organization_id,
              o.org, o.orgName, o.logo
       FROM users u
       LEFT JOIN organizations o ON u.organization_id = o.id
       WHERE u.email = ? AND u.role = 'admin' AND u.is_active = TRUE`,
      [email],
    )

    if (adminRows.length === 0) {
      await LoginAttemptTracker.trackFailedAttempt(email, ipAddress, 'admin');
      const newFailedAttempts = await LoginAttemptTracker.getFailedAttempts(email, ipAddress, 'admin');
      const maxAttempts = LoginAttemptTracker.getMaxAttempts();
      return res.status(401).json({ 
        error: "Invalid credentials or account inactive",
        attempts: newFailedAttempts,
        remainingAttempts: Math.max(0, maxAttempts - newFailedAttempts)
      })
    }

    const admin = adminRows[0]
    const isPasswordValid = await bcrypt.compare(password, admin.password)

    if (!isPasswordValid) {
      await LoginAttemptTracker.trackFailedAttempt(email, ipAddress, 'admin');
      const newFailedAttempts = await LoginAttemptTracker.getFailedAttempts(email, ipAddress, 'admin');
      const maxAttempts = LoginAttemptTracker.getMaxAttempts();
      return res.status(401).json({ 
        error: "Invalid credentials",
        attempts: newFailedAttempts,
        remainingAttempts: Math.max(0, maxAttempts - newFailedAttempts)
      })
    }

    // MFA removed for admin accounts - only superadmin accounts use MFA
    // Use unified signAccessToken function
    const accessToken = signAccessToken({
        id: admin.id,
        email: admin.email,
      role: 'admin',
        organization_id: admin.organization_id,
        org: admin.org,
        orgName: admin.orgName,
    })

    // Issue refresh token (works for all roles with unified users table!)
    const { token: refreshToken } = await issueRefreshToken(admin.id, {
      userAgent: req.headers['user-agent'],
      ipAddress: getClientIpAddress(req),
    });

    await SessionSecurity.createAdminSession(
      admin.id,
      getClientIpAddress(req),
      req.headers['user-agent'],
      accessToken
    )

    await LoginAttemptTracker.clearFailedAttempts(email, ipAddress, 'admin');
    
    await logAdminAction(admin.id, 'login', 'Admin logged in', req)
    
    // Set both tokens as httpOnly cookies (secure!)
    // Pass req to cookie options functions so they can use forwarded host for domain
    const accessCookieOptions = getAccessTokenCookieOptions(req);
    const refreshCookieOptions = getRefreshCookieOptions(req);
    
    // Debug logging (development only)
    if (process.env.NODE_ENV === 'development') {
      console.log('[loginAdmin] Setting cookies:', {
        accessTokenLength: accessToken.length,
        refreshTokenLength: refreshToken.length,
        accessCookieOptions,
        refreshCookieOptions,
        host: req.headers.host,
        origin: req.headers.origin,
        'x-forwarded-host': req.headers['x-forwarded-host']
      });
      
      // Log cookie options BEFORE setting to verify maxAge
      console.log('[loginAdmin] Cookie options BEFORE setting cookies:', {
        accessCookieOptions,
        refreshCookieOptions,
        accessTokenLength: accessToken.length,
        refreshTokenLength: refreshToken.length
      });
    }
    
    // Set both tokens as httpOnly cookies
    // Express will automatically overwrite existing cookies with the same name
    res.cookie('access_token', accessToken, accessCookieOptions)
    res.cookie('refresh_token', refreshToken, refreshCookieOptions)
    
    // Log the actual Set-Cookie headers being sent (development only)
    if (process.env.NODE_ENV === 'development') {
      const setCookieHeaders = res.getHeader('Set-Cookie');
      console.log('[loginAdmin] Set-Cookie headers being sent:', setCookieHeaders);
    }
    
    res.json({
      message: "Login successful",
      admin: {
        id: admin.id,
        organization_id: admin.organization_id,
        org: admin.org,
        orgName: admin.orgName,
        logo: admin.logo,
        email: admin.email,
        role: 'admin', // Fixed role for all admins
        status: admin.is_active ? "ACTIVE" : "INACTIVE",
      },
    })
  } catch (err) {
    res.status(500).json({ error: "Internal server error during login" })
  }
}

// JWT verification middleware
export const verifyAdminToken = (req, res, next) => {
  // Try cookie first (more secure), then header (for backward compatibility)
  const token = req.cookies?.access_token || req.headers.authorization?.split(" ")[1]

  if (!token) {
    return res.status(401).json({ error: "Access token required" })
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET, {
      issuer: process.env.JWT_ISS || "faith-community-api",
      audience: process.env.JWT_AUD || "faith-community-client",
    })
    req.admin = decoded
    next()
  } catch (err) {
    return res.status(403).json({ error: "Invalid or expired token" })
  }
}

// -------------------- MFA Removed for Admins --------------------
// MFA functionality has been removed for admin accounts.
// Only superadmin accounts use MFA for enhanced security.
// Admin accounts rely on strong passwords and rate limiting.


export const getAllAdmins = async (req, res) => {
  try {
    const [rows] = await db.execute(
      `SELECT u.id, u.email, u.is_active, u.organization_id, u.created_at, u.password_changed_at,
              o.org, o.orgName, o.logo
       FROM users u
       LEFT JOIN organizations o ON u.organization_id = o.id
       WHERE u.role = 'admin'
       ORDER BY u.created_at DESC`
    )
    res.json(rows)
  } catch (err) {
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
      `SELECT u.id, u.email, u.is_active, u.organization_id, u.created_at, u.password_changed_at,
              o.org, o.orgName, o.logo
       FROM users u
       LEFT JOIN organizations o ON u.organization_id = o.id
       WHERE u.id = ? AND u.role = 'admin'`,
      [id],
    )

    if (rows.length === 0) {
      return res.status(404).json({ message: "Admin not found" })
    }

    res.json(rows[0])
  } catch (err) {
    res.status(500).json({ error: "Internal server error while fetching admin" })
  }
}

export const updateAdmin = async (req, res) => {
  const { id } = req.params
  const { email, password, role, is_active } = req.body

  if (!id || isNaN(id)) {
    return res.status(400).json({ error: "Invalid admin ID" })
  }

  // Get a connection for transaction
  const connection = await db.getConnection()

  try {
    // Start transaction
    await connection.beginTransaction()

    // Check if admin exists
    const [existingAdmin] = await connection.execute("SELECT id, email, organization_id, is_active FROM users WHERE id = ? AND role = 'admin'", [id])

    if (existingAdmin.length === 0) {
      await connection.rollback()
      return res.status(404).json({ error: "Admin not found" })
    }

    const currentAdmin = existingAdmin[0]

    // Validate email if provided
    if (email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(email)) {
        await connection.rollback()
        return res.status(400).json({ error: "Invalid email format" })
      }

      // Check if email is already taken by another user
      const [emailCheck] = await connection.execute("SELECT id FROM users WHERE email = ? AND id != ?", [email, id])
      if (emailCheck.length > 0) {
        await connection.rollback()
        return res.status(409).json({ error: "Email is already taken by another admin" })
      }
    }

    // Prepare update data
    const updateData = {
      email: email || currentAdmin.email,
      role: role || 'admin',
      is_active: is_active !== undefined ? is_active : true,
    }

    // Update admin table
    let adminQuery, adminParams

    if (password && password.trim() !== "") {
      // Validate password requirements (matching frontend)
      if (password.length < 8) {
        await connection.rollback()
        return res.status(400).json({ error: "Password must be at least 8 characters long" })
      }
      if (!/(?=.*[a-z])/.test(password)) {
        await connection.rollback()
        return res.status(400).json({ error: "Password must contain at least one lowercase letter" })
      }
      if (!/(?=.*[A-Z])/.test(password)) {
        await connection.rollback()
        return res.status(400).json({ error: "Password must contain at least one uppercase letter" })
      }
      if (!/(?=.*\d)/.test(password)) {
        await connection.rollback()
        return res.status(400).json({ error: "Password must contain at least one number" })
      }

      const saltRounds = 10
      const hashedPassword = await bcrypt.hash(password, saltRounds)
      
      adminQuery = "UPDATE users SET email = ?, password_hash = ?, is_active = ?, password_changed_at = NOW() WHERE id = ? AND role = 'admin'"
      adminParams = [updateData.email, hashedPassword, updateData.is_active, id]
    } else {
      adminQuery = "UPDATE users SET email = ?, is_active = ? WHERE id = ? AND role = 'admin'"
      adminParams = [updateData.email, updateData.is_active, id]
    }

    await connection.execute(adminQuery, adminParams)

    // If is_active status is being changed, also update organization status
    if (is_active !== undefined && is_active !== currentAdmin.is_active && currentAdmin.organization_id) {
      const newOrgStatus = is_active ? 'ACTIVE' : 'INACTIVE'
      await connection.execute(
        `UPDATE organizations SET status = ? WHERE id = ?`, 
        [newOrgStatus, currentAdmin.organization_id]
      )
    }

    await connection.commit()

    // Log superadmin action
    await logSuperadminAction(req.superadmin?.id, 'update_admin', `Updated admin ${id}: ${JSON.stringify(updateData)}`, req)

    // Get updated admin data with organization info
    const [updatedAdmin] = await db.execute(
      `SELECT u.id, u.email, u.is_active, u.organization_id, u.created_at,
              o.org, o.orgName
       FROM users u
       LEFT JOIN organizations o ON u.organization_id = o.id
       WHERE u.id = ? AND u.role = 'admin'`,
      [id]
    )

    res.json({
      message: "Admin updated successfully",
      admin: updatedAdmin[0],
    })
  } catch (err) {
    await connection.rollback()
    res.status(500).json({ error: "Internal server error while updating admin" })
  } finally {
    connection.release()
  }
}

export const deactivateAdmin = async (req, res) => {
  const { id } = req.params

  if (!id || isNaN(id)) {
    return res.status(400).json({ error: "Invalid admin ID" })
  }

  const connection = await db.getConnection()
  
  try {
    await connection.beginTransaction()

    const [existingAdmin] = await connection.execute(
      "SELECT id, is_active, organization_id FROM users WHERE id = ? AND role = 'admin'", 
      [id]
    )

    if (existingAdmin.length === 0) {
      await connection.rollback()
      return res.status(404).json({ error: "Admin not found" })
    }

    const currentStatus = existingAdmin[0].is_active
    const newStatus = !currentStatus
    const action = newStatus ? 'reactivated' : 'deactivated'
    const organizationId = existingAdmin[0].organization_id

    // Toggle is_active between TRUE and FALSE
    await connection.execute(`UPDATE users SET is_active = ? WHERE id = ? AND role = 'admin'`, [newStatus, id])

    // If deactivating admin, also deactivate their organization
    if (!newStatus && organizationId) {
      await connection.execute(
        `UPDATE organizations SET status = 'INACTIVE' WHERE id = ?`, 
        [organizationId]
      )
    }
    // If reactivating admin, also reactivate their organization
    else if (newStatus && organizationId) {
      await connection.execute(
        `UPDATE organizations SET status = 'ACTIVE' WHERE id = ?`, 
        [organizationId]
      )
    }

    await connection.commit()

    // Log superadmin action
    await logSuperadminAction(req.superadmin?.id, 'deactivate_admin', `${action} admin ${id} (org: ${organizationId})`, req)

    res.json({ 
      message: `Admin ${action} successfully`,
      is_active: newStatus,
      organization_updated: organizationId ? true : false
    })
  } catch (err) {
    await connection.rollback()
    res.status(500).json({ error: "Internal server error while updating admin status" })
  } finally {
    connection.release()
  }
}

export const deleteAdmin = async (req, res) => {
  const { id } = req.params

  if (!id || isNaN(id)) {
    return res.status(400).json({ error: "Invalid admin ID" })
  }

  const connection = await db.getConnection()
  
  try {
    await connection.beginTransaction()

    // Get admin details including organization_id
    const [existingAdmin] = await connection.execute(
      "SELECT id, organization_id FROM users WHERE id = ? AND role = 'admin'", 
      [id]
    )

    if (existingAdmin.length === 0) {
      await connection.rollback()
      return res.status(404).json({ error: "Admin not found" })
    }

    const admin = existingAdmin[0]
    const organizationId = admin.organization_id

    // Hard delete: permanently remove admin from database
    await connection.execute('DELETE FROM users WHERE id = ? AND role = \'admin\'', [id])

    // Handle organization cleanup
    if (organizationId) {
      // Check if there are other active admins for this organization
      const [otherAdmins] = await connection.execute(
        "SELECT COUNT(*) as count FROM users WHERE organization_id = ? AND role = 'admin' AND is_active = TRUE",
        [organizationId]
      )

      const hasOtherActiveAdmins = otherAdmins[0].count > 0

      if (!hasOtherActiveAdmins) {
        // No other active admins - set organization to INACTIVE
        await connection.execute(
          "UPDATE organizations SET status = 'INACTIVE' WHERE id = ?",
          [organizationId]
        )
      }
      // If there are other active admins, leave organization as-is
    }

    await connection.commit()

    // Log superadmin action
    await logSuperadminAction(req.superadmin?.id, 'delete_admin', `Deleted admin ${id} (org: ${organizationId})`, req)

    res.json({ 
      message: "Admin deleted successfully",
      organization_updated: organizationId ? true : false
    })
  } catch (err) {
    await connection.rollback()
    res.status(500).json({ error: "Internal server error while deleting admin" })
  } finally {
    connection.release()
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
      'SELECT id, password_hash as password, is_active FROM users WHERE id = ? AND role = \'admin\' AND is_active = TRUE',
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
      'SELECT id, password_hash as password, is_active FROM users WHERE id = ? AND role = \'admin\' AND is_active = TRUE',
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
    res.status(500).json({ error: "Internal server error during password verification" })
  }
}

// Forgot password - send reset email
export const forgotPassword = async (req, res) => {
  const { email } = req.body

  if (!email || !email.trim()) {
    return res.status(400).json({ error: "Email is required" })
  }

  try {
    // Check if admin exists with this email
    const [adminRows] = await db.execute(
      'SELECT id, email, organization_id FROM users WHERE email = ? AND role = \'admin\' AND is_active = TRUE',
      [email]
    )

    if (adminRows.length === 0) {
      // Don't reveal if email exists or not for security
      return res.json({ message: "If an account with that email exists, a password reset link has been sent." })
    }

    const admin = adminRows[0]

    // Generate unique token
    const crypto = await import('crypto')
    const token = crypto.randomBytes(32).toString('hex')
    
    // Set expiration (1 hour from now)
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000)

    // Store token in database
    await db.execute(
      'INSERT INTO password_reset_tokens (email, token, expires_at) VALUES (?, ?, ?)',
      [email, token, expiresAt]
    )

    // Send email with reset link
    const resetLink = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password?token=${token}&type=admin`
    
    const { sendMail } = await import('../../utils/mailer.js')
    
    await sendMail({
      to: email,
      subject: "Password Reset Request - FAITH CommUNITY",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #1A685B;">Password Reset Request</h2>
          <p>Hello,</p>
          <p>You have requested to reset your password for your FAITH CommUNITY admin account.</p>
          <p>Click the button below to reset your password:</p>
          <a href="${resetLink}" style="display: inline-block; background: #1A685B; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0;">Reset Password</a>
          <p>This link will expire in 1 hour.</p>
          <p>If you didn't request this password reset, please ignore this email.</p>
          <p>Best regards,<br>FAITH CommUNITY Team</p>
        </div>
      `,
      text: `Password Reset Request - FAITH CommUNITY\n\nHello,\n\nYou have requested to reset your password for your FAITH CommUNITY admin account.\n\nClick the following link to reset your password:\n${resetLink}\n\nThis link will expire in 1 hour.\n\nIf you didn't request this password reset, please ignore this email.\n\nBest regards,\nFAITH CommUNITY Team`
    })

    res.json({ message: "If an account with that email exists, a password reset link has been sent." })
  } catch (err) {
    res.status(500).json({ error: "Internal server error while processing password reset request" })
  }
}

// Reset password with token
export const resetPassword = async (req, res) => {
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

    // Update password in unified users table
    await db.execute(
      'UPDATE users SET password_hash = ?, password_changed_at = NOW() WHERE email = ?',
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
    logError('Error resetting password (admin)', err, { 
      context: 'adminController', 
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
    res.status(500).json({ error: "Internal server error while validating token" })
  }
}

// Check if email exists in admin system
export const checkEmailAdmin = async (req, res) => {
  const { email } = req.body

  if (!email || !email.trim()) {
    return res.status(400).json({ error: "Email is required" })
  }

  try {
    const [adminRows] = await db.execute(
      'SELECT id FROM users WHERE email = ? AND role = \'admin\' AND is_active = TRUE',
      [email]
    )

    if (adminRows.length > 0) {
      res.json({ exists: true })
    } else {
      res.status(404).json({ exists: false })
    }
  } catch (err) {
    res.status(500).json({ error: "Internal server error" })
  }
}