import { sendMail } from "./mailer.js";

export class PasswordChangeNotification {
  // Send password change notification to user
  static async sendPasswordChangeNotification(email, userName = null, userRole = 'user') {
    const displayName = userName || 'User';
    const roleDisplay = userRole === 'superadmin' ? 'Superadmin' : 
                       userRole === 'admin' ? 'Admin' : 'User';
    
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #1A685B 0%, #2D7A6B 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 24px;">FAITH CommUNITY</h1>
          <p style="color: #B8E6D9; margin: 10px 0 0 0;">Security Notification</p>
        </div>
        
        <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px;">
          <h2 style="color: #1A685B; margin-top: 0;">Password Changed Successfully</h2>
          
          <p>Hello ${displayName},</p>
          
          <p>This is to confirm that your password has been successfully changed for your FAITH CommUNITY ${roleDisplay} account.</p>
          
          <div style="background: #d4edda; border: 1px solid #c3e6cb; border-radius: 6px; padding: 15px; margin: 20px 0;">
            <p style="margin: 0; color: #155724;"><strong>Account Details:</strong></p>
            <p style="margin: 5px 0 0 0;"><strong>Email:</strong> ${email}</p>
            <p style="margin: 5px 0 0 0;"><strong>Role:</strong> ${roleDisplay}</p>
            <p style="margin: 5px 0 0 0;"><strong>Time:</strong> ${new Date().toLocaleString()}</p>
          </div>
          
          <div style="background: #fff3cd; border: 1px solid #ffeaa7; border-radius: 6px; padding: 15px; margin: 20px 0;">
            <p style="margin: 0; color: #856404;"><strong>Security Reminder:</strong> If you did not make this change, please contact our support team immediately as your account may be compromised.</p>
          </div>
          
          <div style="background: #d1ecf1; border: 1px solid #bee5eb; border-radius: 6px; padding: 15px; margin: 20px 0;">
            <p style="margin: 0; color: #0c5460;"><strong>Next Steps:</strong> You may need to log in again with your new password on all devices where you're currently signed in.</p>
          </div>
          
          <p style="color: #666; font-size: 14px; margin-top: 30px;">
            This is an automated security notification from FAITH CommUNITY.
          </p>
        </div>
      </div>
    `;

    const text = `
      FAITH CommUNITY - Password Changed Successfully
      
      Hello ${displayName},
      
      This is to confirm that your password has been successfully changed for your FAITH CommUNITY ${roleDisplay} account.
      
      Account Details:
      - Email: ${email}
      - Role: ${roleDisplay}
      - Time: ${new Date().toLocaleString()}
      
      Security Reminder: If you did not make this change, please contact our support team immediately as your account may be compromised.
      
      Next Steps: You may need to log in again with your new password on all devices where you're currently signed in.
      
      This is an automated security notification from FAITH CommUNITY.
    `;

    try {
      await sendMail({
        to: email,
        subject: 'Password Changed Successfully - FAITH CommUNITY',
        html,
        text
      });
    } catch (error) {
      console.warn('Failed to send password change notification:', error.message);
      // In development mode, log the notification
      if (process.env.NODE_ENV === 'development' || !process.env.SMTP_HOST) {
        console.log(`\n🔐 PASSWORD CHANGE NOTIFICATION FOR ${email}: Password changed successfully\n`);
        console.log('⚠️  SMTP not configured - notification logged to console for development');
      }
    }
  }
}
