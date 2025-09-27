# SMTP Setup Guide for Email Change Feature

## Overview
The secure email change feature requires SMTP configuration to send OTP verification codes and security notifications. This guide explains how to set up SMTP for different email providers.

## Environment Variables Required

Add these variables to your `.env` file in the backend directory:

```env
# SMTP Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
MAIL_FROM="FAITH CommUNITY" <your-email@gmail.com>
```

## Gmail Setup (Recommended)

### 1. Enable 2-Factor Authentication
- Go to your Google Account settings
- Navigate to Security → 2-Step Verification
- Enable 2-Step Verification

### 2. Generate App Password
- In Google Account settings, go to Security
- Under "2-Step Verification", click "App passwords"
- Select "Mail" and your device
- Copy the generated 16-character password

### 3. Configure Environment Variables
```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-gmail@gmail.com
SMTP_PASS=your-16-char-app-password
MAIL_FROM="FAITH CommUNITY" <your-gmail@gmail.com>
```

## Other Email Providers

### Outlook/Hotmail
```env
SMTP_HOST=smtp-mail.outlook.com
SMTP_PORT=587
SMTP_USER=your-email@outlook.com
SMTP_PASS=your-password
```

### Yahoo Mail
```env
SMTP_HOST=smtp.mail.yahoo.com
SMTP_PORT=587
SMTP_USER=your-email@yahoo.com
SMTP_PASS=your-app-password
```

### Custom SMTP Server
```env
SMTP_HOST=your-smtp-server.com
SMTP_PORT=587
SMTP_USER=your-username
SMTP_PASS=your-password
```

## Development Mode

If SMTP is not configured, the system will:
1. Log a warning about SMTP connection failure
2. Display the OTP in the console for development testing
3. Continue with the email change process

**Console Output Example:**
```
🔐 EMAIL CHANGE OTP FOR user@example.com: 123456
⚠️  SMTP not configured - OTP logged to console for development
```

## Testing SMTP Configuration

### 1. Test Email Sending
```bash
cd backend
node -e "
import('./src/utils/mailer.js').then(async (mailer) => {
  try {
    await mailer.sendMail({
      to: 'test@example.com',
      subject: 'Test Email',
      text: 'This is a test email'
    });
    console.log('✅ Email sent successfully');
  } catch (error) {
    console.error('❌ Email failed:', error.message);
  }
});
"
```

### 2. Test Email Change Flow
```bash
cd backend
node test_email_change.js
```

## Security Considerations

### 1. App Passwords
- Use app-specific passwords instead of your main account password
- Never commit SMTP credentials to version control
- Use environment variables for all sensitive data

### 2. Rate Limiting
- Consider implementing rate limiting for email change requests
- Monitor for suspicious email change attempts

### 3. Email Validation
- The system validates email formats
- Checks for duplicate emails across all user types
- Sends security notifications to current email

## Troubleshooting

### Common Issues

#### 1. "ECONNREFUSED" Error
- **Cause**: SMTP server not accessible or wrong host/port
- **Solution**: Verify SMTP_HOST and SMTP_PORT settings

#### 2. "Authentication Failed" Error
- **Cause**: Wrong username/password or 2FA not enabled
- **Solution**: Use app password for Gmail, verify credentials

#### 3. "Connection Timeout" Error
- **Cause**: Firewall blocking SMTP port
- **Solution**: Check firewall settings, try different port

#### 4. Emails Going to Spam
- **Cause**: Email server reputation or content filtering
- **Solution**: Configure SPF, DKIM records for your domain

### Debug Mode
Enable debug logging by setting in your `.env`:
```env
NODE_ENV=development
```

This will show detailed SMTP connection logs.

## Production Deployment

### 1. Use Dedicated Email Service
Consider using dedicated email services for production:
- **SendGrid**: Reliable email delivery service
- **Mailgun**: Developer-friendly email API
- **Amazon SES**: Cost-effective for high volume

### 2. Environment Variables
Ensure all SMTP credentials are properly set in production environment.

### 3. Monitoring
- Monitor email delivery rates
- Set up alerts for failed email sends
- Track email change request patterns

## Example Production Configuration (SendGrid)

```env
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASS=your-sendgrid-api-key
MAIL_FROM="FAITH CommUNITY" <noreply@yourdomain.com>
```

## Support

If you encounter issues with SMTP setup:
1. Check the console logs for specific error messages
2. Verify your email provider's SMTP settings
3. Test with a simple email sending script
4. Contact your email provider's support if needed

The email change feature will work in development mode even without SMTP configuration, but production deployment requires proper SMTP setup for security and user experience.
