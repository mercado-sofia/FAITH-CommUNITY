import db from "../../database.js"
import * as bcrypt from "bcrypt"
import jwt from "jsonwebtoken"
import { logError } from "../../utils/logger.js"

const JWT_SECRET = process.env.JWT_SECRET

export const getAdminProfile = async (req, res) => {
  try {
    const adminId = req.admin.id

    const [rows] = await db.execute(
      `SELECT u.id, u.email, u.is_active, u.organization_id, u.created_at, u.password_changed_at,
              o.org, o.orgName
       FROM users u
       LEFT JOIN organizations o ON u.organization_id = o.id
       WHERE u.id = ? AND u.role = 'admin'`,
      [adminId]
    )

    if (rows.length === 0) {
      return res.status(404).json({ error: "Admin not found" })
    }

    const admin = rows[0]
    
    delete admin.password
    
    res.json({
      success: true,
      data: admin
    })
  } catch (err) {
    res.status(500).json({ error: "Internal server error" })
  }
}

export const updateAdminProfile = async (req, res) => {
  try {
    const adminId = req.admin.id
    const { email, password } = req.body

    if (!email) {
      return res.status(400).json({ error: "Email is required" })
    }

    const [currentAdminRows] = await db.execute(
      "SELECT email FROM users WHERE id = ? AND role = 'admin'",
      [adminId]
    )

    if (currentAdminRows.length === 0) {
      return res.status(404).json({ error: "Admin not found" })
    }

    const currentAdmin = currentAdminRows[0]
    const hasChanges = currentAdmin.email !== email

    if (hasChanges && !password) {
      return res.status(400).json({ error: "Current password is required to confirm changes" })
    }

    if (hasChanges) {
      const [adminRows] = await db.execute(
        "SELECT password_hash as password FROM users WHERE id = ? AND role = 'admin'",
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

    const [existingAdmin] = await db.execute(
      "SELECT id FROM users WHERE email = ? AND id != ?",
      [email, adminId]
    )

    if (existingAdmin.length > 0) {
      return res.status(409).json({ error: "Email is already taken" })
    }

    await db.execute(
      "UPDATE users SET email = ? WHERE id = ? AND role = 'admin'",
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

export const requestAdminEmailChange = async (req, res) => {
  try {
    const adminId = req.admin.id
    const { newEmail, currentPassword } = req.body

    if (!newEmail || !currentPassword) {
      return res.status(400).json({ error: "New email and current password are required" })
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newEmail)) {
      return res.status(400).json({ error: "Invalid email format" });
    }

    const [adminRows] = await db.execute(
      "SELECT email, password_hash as password FROM users WHERE id = ? AND role = 'admin'",
      [adminId]
    )

    if (adminRows.length === 0) {
      return res.status(404).json({ error: "Admin not found" })
    }

    const admin = adminRows[0];

    if (newEmail === admin.email) {
      return res.status(400).json({ error: "New email must be different from current email" });
    }

    const isPasswordValid = await bcrypt.compare(currentPassword, admin.password)
    if (!isPasswordValid) {
      return res.status(401).json({ error: "Invalid password" })
    }

    const [existingAdmin] = await db.execute(
      "SELECT id FROM users WHERE email = ? AND id != ?",
      [newEmail, adminId]
    )

    if (existingAdmin.length > 0) {
      return res.status(409).json({ error: "Email is already taken" })
    }

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

export const verifyAdminEmailChangeOTP = async (req, res) => {
  try {
    const adminId = req.admin.id
    const { token, otp } = req.body

    if (!token || !otp) {
      return res.status(400).json({ error: "Token and OTP are required" })
    }

    const { EmailChangeOTP } = await import('../../utils/emailChangeOTP.js');
    const verificationResult = await EmailChangeOTP.verifyOTP(token, otp, adminId, 'admin');

    if (!verificationResult.success) {
      return res.status(400).json({ error: verificationResult.error });
    }

    await db.execute(
      "UPDATE users SET email = ? WHERE id = ? AND role = 'admin'",
      [verificationResult.newEmail, adminId]
    );

    const [updatedAdminRows] = await db.execute(
      `SELECT u.id, u.email, u.role, u.is_active, u.organization_id,
              o.org, o.orgName, o.logo
       FROM users u
       LEFT JOIN organizations o ON u.organization_id = o.id
       WHERE u.id = ? AND u.role = 'admin'`,
      [adminId]
    );

    if (updatedAdminRows.length === 0) {
      return res.status(404).json({ error: "Admin not found after email update" });
    }

    const updatedAdmin = updatedAdminRows[0];

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
    logError('Error verifying admin email change OTP', err, {
      context: 'admin_profile_controller',
      adminId: req.admin?.id,
      errorStack: err.stack
    });
    
    const errorMessage = process.env.NODE_ENV === 'development' 
      ? err.message 
      : 'Internal server error';
    
    res.status(500).json({ error: errorMessage });
  }
}

export const updateAdminPassword = async (req, res) => {
  try {
    const adminId = req.admin.id
    const { currentPassword, newPassword } = req.body

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: "Current and new password are required" })
    }

    if (newPassword.length < 8) {
      return res.status(400).json({ error: "Password must be at least 8 characters long" })
    }

    if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(newPassword)) {
      return res.status(400).json({ 
        error: "Password must contain at least one uppercase letter, one lowercase letter, and one number" 
      })
    }

    const [adminRows] = await db.execute(
      "SELECT password_hash as password, email FROM users WHERE id = ? AND role = 'admin' AND is_active = TRUE",
      [adminId]
    )

    if (adminRows.length === 0) {
      return res.status(404).json({ error: "Admin not found or inactive" })
    }

    const isPasswordValid = await bcrypt.compare(currentPassword, adminRows[0].password)
    if (!isPasswordValid) {
      return res.status(401).json({ error: "Invalid current password" })
    }

    const saltRounds = 12
    const hashedPassword = await bcrypt.hash(newPassword, saltRounds)

    await db.execute(
      "UPDATE users SET password_hash = ?, password_changed_at = NOW(), updated_at = NOW() WHERE id = ? AND role = 'admin'",
      [hashedPassword, adminId]
    )

    try {
      const { revokeAllUserRefreshTokens } = await import('../../utils/jwt.js');
      await revokeAllUserRefreshTokens(adminId);
    } catch {}
    const { getClearCookieOptions } = await import('../../utils/jwt.js');
    const clearCookieOptions = getClearCookieOptions(req);
    res.clearCookie('access_token', clearCookieOptions);
    res.clearCookie('refresh_token', clearCookieOptions);

    try {
      const { PasswordChangeNotification } = await import('../../utils/passwordChangeNotification.js');
      await PasswordChangeNotification.sendPasswordChangeNotification(
        adminRows[0].email, 
        null, // Admins don't have first_name/last_name
        'admin'
      );
    } catch (notificationError) {
    }

    res.json({
      success: true,
      message: "Password updated successfully"
    })
  } catch (err) {
    res.status(500).json({ error: "Internal server error" })
  }
}

export const verifyPasswordForEmailChange = async (req, res) => {
  try {
    const adminId = req.admin.id
    const { password } = req.body

    if (!password) {
      return res.status(400).json({ error: "Password is required" })
    }

    const [adminRows] = await db.execute(
      "SELECT password_hash as password FROM users WHERE id = ? AND role = 'admin'",
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