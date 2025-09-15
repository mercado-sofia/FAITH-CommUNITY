import db from "../database.js";
import crypto from "crypto";
import { sendMail } from "./mailer.js";

export class EmailChangeOTP {
  // Create email change OTP
  static async createEmailChangeOTP(userId, userRole, newEmail, currentEmail, userName = null) {
    try {
      // Generate 6-digit OTP
      const otp = crypto.randomInt(100000, 999999).toString();
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes
      const token = crypto.randomBytes(32).toString('hex');

      // Store OTP in database
      await db.execute(
        `INSERT INTO email_change_otps (user_id, user_role, new_email, current_email, otp, token, expires_at, created_at) 
         VALUES (?, ?, ?, ?, ?, ?, ?, NOW())`,
        [userId, userRole, newEmail, currentEmail, otp, token, expiresAt]
      );

  // Send OTP email to new email address
  try {
    await this.sendOTPEmail(newEmail, otp, userName);
  } catch (emailError) {
    console.warn('Failed to send OTP email:', emailError.message);
    // In development mode, log the OTP to console
    if (process.env.NODE_ENV === 'development' || !process.env.SMTP_HOST) {
      console.log(`\n🔐 EMAIL CHANGE OTP FOR ${newEmail}: ${otp}\n`);
      console.log('⚠️  SMTP not configured - OTP logged to console for development');
    }
    // Continue with the process even if email fails
  }

  // Send security notification to current email
  try {
    await this.sendSecurityNotification(currentEmail, newEmail, userName);
  } catch (emailError) {
    console.warn('Failed to send security notification:', emailError.message);
    // Continue with the process even if email fails
  }

      return {
        success: true,
        token,
        expiresAt,
        message: 'OTP sent to new email address'
      };
    } catch (error) {
      console.error('Error creating email change OTP:', error);
      throw new Error('Failed to create email change OTP');
    }
  }

  // Verify OTP
  static async verifyOTP(token, otp, userId, userRole) {
    try {
      const [rows] = await db.execute(
        `SELECT * FROM email_change_otps 
         WHERE token = ? AND user_id = ? AND user_role = ? AND expires_at > NOW() AND used = FALSE`,
        [token, userId, userRole]
      );

      if (rows.length === 0) {
        return {
          success: false,
          error: 'Invalid or expired OTP'
        };
      }

      const otpRecord = rows[0];

      if (otpRecord.otp !== otp) {
        return {
          success: false,
          error: 'Invalid OTP'
        };
      }

      // Mark OTP as used
      await db.execute(
        'UPDATE email_change_otps SET used = TRUE, verified_at = NOW() WHERE id = ?',
        [otpRecord.id]
      );

      return {
        success: true,
        newEmail: otpRecord.new_email,
        currentEmail: otpRecord.current_email
      };
    } catch (error) {
      console.error('Error verifying OTP:', error);
      throw new Error('Failed to verify OTP');
    }
  }

  // Clean up expired OTPs
  static async cleanupExpiredOTPs() {
    try {
      await db.execute(
        'DELETE FROM email_change_otps WHERE expires_at < NOW()'
      );
    } catch (error) {
      console.error('Error cleaning up expired OTPs:', error);
    }
  }

  // Send OTP email
  static async sendOTPEmail(email, otp, userName = null) {
    const displayName = userName || 'User';
    
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #1A685B 0%, #2D8F7F 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 24px;">FAITH CommUNITY</h1>
          <p style="color: #E8F5F3; margin: 10px 0 0 0;">Email Change Verification</p>
        </div>
        
        <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px;">
          <h2 style="color: #1A685B; margin-top: 0;">Hello ${displayName}!</h2>
          
          <p>You have requested to change your email address. To complete this process, please use the verification code below:</p>
          
          <div style="background: white; border: 2px solid #1A685B; border-radius: 8px; padding: 20px; text-align: center; margin: 20px 0;">
            <h1 style="color: #1A685B; font-size: 32px; letter-spacing: 5px; margin: 0; font-family: 'Courier New', monospace;">${otp}</h1>
          </div>
          
          <p><strong>Important Security Information:</strong></p>
          <ul style="color: #666;">
            <li>This code will expire in 15 minutes</li>
            <li>Never share this code with anyone</li>
            <li>If you didn't request this change, please ignore this email</li>
          </ul>
          
          <div style="background: #fff3cd; border: 1px solid #ffeaa7; border-radius: 6px; padding: 15px; margin: 20px 0;">
            <p style="margin: 0; color: #856404;"><strong>Security Alert:</strong> If you didn't request this email change, please contact our support team immediately.</p>
          </div>
          
          <p style="color: #666; font-size: 14px; margin-top: 30px;">
            This email was sent because someone requested to change the email address associated with your FAITH CommUNITY account.
          </p>
        </div>
      </div>
    `;

    const text = `
      FAITH CommUNITY - Email Change Verification
      
      Hello ${displayName}!
      
      You have requested to change your email address. To complete this process, please use the verification code below:
      
      ${otp}
      
      Important Security Information:
      - This code will expire in 15 minutes
      - Never share this code with anyone
      - If you didn't request this change, please ignore this email
      
      Security Alert: If you didn't request this email change, please contact our support team immediately.
      
      This email was sent because someone requested to change the email address associated with your FAITH CommUNITY account.
    `;

    await sendMail({
      to: email,
      subject: 'Email Change Verification - FAITH CommUNITY',
      html,
      text
    });
  }

  // Send security notification to current email
  static async sendSecurityNotification(currentEmail, newEmail, userName = null) {
    const displayName = userName || 'User';
    
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #dc3545 0%, #c82333 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 24px;">FAITH CommUNITY</h1>
          <p style="color: #f8d7da; margin: 10px 0 0 0;">Security Alert</p>
        </div>
        
        <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px;">
          <h2 style="color: #dc3545; margin-top: 0;">Security Alert</h2>
          
          <p>Hello ${displayName},</p>
          
          <p>We're writing to inform you that a request has been made to change the email address associated with your FAITH CommUNITY account.</p>
          
          <div style="background: white; border: 1px solid #dee2e6; border-radius: 8px; padding: 20px; margin: 20px 0;">
            <p style="margin: 0;"><strong>Current Email:</strong> ${currentEmail}</p>
            <p style="margin: 10px 0 0 0;"><strong>Requested New Email:</strong> ${newEmail}</p>
          </div>
          
          <div style="background: #fff3cd; border: 1px solid #ffeaa7; border-radius: 6px; padding: 15px; margin: 20px 0;">
            <p style="margin: 0; color: #856404;"><strong>Important:</strong> If you made this request, you can safely ignore this email. The change will only be completed after verification.</p>
          </div>
          
          <div style="background: #f8d7da; border: 1px solid #f5c6cb; border-radius: 6px; padding: 15px; margin: 20px 0;">
            <p style="margin: 0; color: #721c24;"><strong>Security Warning:</strong> If you did NOT request this email change, please contact our support team immediately as your account may be compromised.</p>
          </div>
          
          <p style="color: #666; font-size: 14px; margin-top: 30px;">
            This is an automated security notification from FAITH CommUNITY.
          </p>
        </div>
      </div>
    `;

    const text = `
      FAITH CommUNITY - Security Alert
      
      Hello ${displayName},
      
      We're writing to inform you that a request has been made to change the email address associated with your FAITH CommUNITY account.
      
      Current Email: ${currentEmail}
      Requested New Email: ${newEmail}
      
      Important: If you made this request, you can safely ignore this email. The change will only be completed after verification.
      
      Security Warning: If you did NOT request this email change, please contact our support team immediately as your account may be compromised.
      
      This is an automated security notification from FAITH CommUNITY.
    `;

    await sendMail({
      to: currentEmail,
      subject: 'Security Alert: Email Change Request - FAITH CommUNITY',
      html,
      text
    });
  }

  // Ensure email_change_otps table exists
  static async ensureTableExists() {
    try {
      await db.execute(`
        CREATE TABLE IF NOT EXISTS email_change_otps (
          id INT AUTO_INCREMENT PRIMARY KEY,
          user_id INT NOT NULL,
          user_role ENUM('user', 'admin', 'superadmin') NOT NULL,
          new_email VARCHAR(255) NOT NULL,
          current_email VARCHAR(255) NOT NULL,
          otp VARCHAR(6) NOT NULL,
          token VARCHAR(64) NOT NULL UNIQUE,
          expires_at DATETIME NOT NULL,
          used BOOLEAN DEFAULT FALSE,
          verified_at DATETIME NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          INDEX idx_token (token),
          INDEX idx_user (user_id, user_role),
          INDEX idx_expires (expires_at)
        )
      `);
    } catch (error) {
      console.error('Error creating email_change_otps table:', error);
      throw error;
    }
  }
}

// Initialize table on module load
EmailChangeOTP.ensureTableExists().catch(console.error);
