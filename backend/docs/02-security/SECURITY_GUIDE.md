# Security Guide

Comprehensive security documentation for the FAITH CommUNITY backend.

## Security Overview

The FAITH CommUNITY platform implements multiple layers of security to protect user data and system integrity. This guide covers all security features, best practices, and known issues.

## Authentication & Authorization

### Login Attempt Tracking

The system tracks failed login attempts to prevent brute-force attacks.

**Features:**
- ✅ Parameterized queries (SQL injection protection)
- ✅ Proper database indexing for performance
- ✅ User type separation (user, admin, superadmin)
- ✅ Automatic cleanup of old attempts (>5 minutes)
- ✅ Race condition protection with transactions
- ✅ IP address handling for proxy environments

**Configuration:**
- Maximum failed attempts: 10 per 5-minute window
- Lockout duration: 5 minutes
- Warning threshold: Red warning appears at 7 attempts (3 remaining)
- Automatic cleanup of expired attempts

### Multi-Factor Authentication (MFA)

MFA is available for superadmin accounts:
- TOTP-based 2FA using authenticator apps
- Optional but recommended for production
- Can be enabled/disabled through the superadmin panel

### Session Management

- JWT-based authentication with secure token storage
- Automatic token refresh mechanism
- CSRF protection on state-changing operations
- Secure cookie configuration

## Secure Email Change

### Implementation

All user roles (General Users, Admin, Superadmin) have secure email change functionality:

**Security Features:**
1. **Multi-Step Verification**
   - Current password verification required
   - OTP sent to new email address
   - Optional 2FA verification for superadmin

2. **Email Notifications**
   - New email receives OTP verification code
   - Old email receives security alert

3. **Security Validations**
   - Password verification before initiating change
   - Email format validation
   - Duplicate email checking across all user types
   - OTP expiration (15 minutes)
   - Token-based verification

**API Endpoints:**

**General Users:**
- `POST /api/users/email/request-change` - Request email change
- `POST /api/users/email/verify-otp` - Verify OTP

**Admin Users:**
- `POST /api/admin/profile/email/request-change` - Request email change
- `POST /api/admin/profile/email/verify-otp` - Verify OTP

**Superadmin Users:**
- `POST /api/superadmin/auth/email/request-change/:id` - Request email change
- `POST /api/superadmin/auth/email/verify-otp/:id` - Verify OTP

## Superadmin Security

### Route Protection

All superadmin routes are protected with `verifySuperadminToken` middleware:

**Secured Routes:**
- ✅ Authentication routes (profile, password, email, 2FA)
- ✅ Admin management (CRUD operations)
- ✅ Program management
- ✅ Notification management
- ✅ Subscription management
- ✅ FAQ management (admin endpoints)
- ✅ User management
- ✅ Organization management
- ✅ Branding management

**Public Routes:**
- Login, forgot password, reset password
- Public FAQ listing (`/api/faqs/active`)

### Superadmin Account

- **Single Account Enforcement**: Only one superadmin account can exist (ID = 1)
- **Database Structure**: Stored in unified `users` table with `role = 'superadmin'`
- **Initialization**: Automatically created on database initialization, can be reset via secure API endpoint with secret key
- **Default Credentials**: `faithcommunityfaces@gmail.com` / `admin123` (must be changed immediately)

## Audit Logging

### Implementation

Comprehensive audit logging system tracks all security-relevant actions:

**Features:**
- ✅ Structured logging with Pino logger
- ✅ Input validation for all audit operations
- ✅ Error handling with proper logging
- ✅ Query functions with validation
- ✅ Automatic cleanup of old logs

**Logged Actions:**
- Login attempts (successful and failed)
- Password changes
- Email changes
- Account lockouts
- Admin actions
- Superadmin actions
- Security events

**Query Functions:**
- `getAuditLogs(userId, userType, limit)` - Get audit logs for a user
- `getRecentAuditLogs(userId, userType, hours, limit)` - Get recent logs
- `getAuditLogsByAction(userId, userType, action, limit)` - Get logs by action

## Security Headers

The application implements security headers via Helmet middleware:

- **Content Security Policy (CSP)**: Restricts resource loading
- **X-Frame-Options**: Prevents clickjacking
- **X-Content-Type-Options**: Prevents MIME sniffing
- **Strict-Transport-Security (HSTS)**: Enforces HTTPS (production)
- **X-XSS-Protection**: XSS protection

## Rate Limiting

Rate limiting is implemented to prevent abuse:

**Configuration:**
- Global rate limit: 1000 requests per 15 minutes
- Auth endpoints: 10 requests per 15 minutes
- Public endpoints: 2000 requests per 15 minutes
- Slowdown thresholds for high traffic

## Password Security

- **Hashing**: Bcrypt with salt rounds (10)
- **Minimum Length**: 8 characters (configurable)
- **Complexity**: Recommended but not enforced
- **Password History**: Tracks password changes
- **Password Reset**: Secure token-based reset with expiration

## Database Security

- **SQL Injection Protection**: All queries use parameterized statements
- **Connection Security**: SSL/TLS for production connections
- **Credential Management**: Environment variables for all credentials
- **Backup Strategy**: Regular database backups recommended

## Environment Variables Security

**Critical Secrets:**
- `JWT_SECRET`: Minimum 32 characters, cryptographically random
- `CSRF_SECRET`: Minimum 32 characters, different from JWT_SECRET
- `SUPERADMIN_INIT_SECRET`: Optional, separate from JWT_SECRET

**Best Practices:**
- ✅ Never commit secrets to version control
- ✅ Use different secrets for development and production
- ✅ Rotate secrets periodically (6-12 months)
- ✅ Store secrets in secure environment variable management
- ✅ Use strong, randomly generated secrets

## Security Monitoring

### Logging

All security events are logged:
- Failed login attempts
- Account lockouts
- Password changes
- Email changes
- Admin actions
- Security violations

### Monitoring Recommendations

1. **Monitor Audit Logs**: Regularly review audit logs for suspicious activity
2. **Failed Login Alerts**: Set up alerts for excessive failed login attempts
3. **Account Lockout Alerts**: Monitor account lockout events
4. **Unusual Activity**: Track unusual patterns in user behavior

## Known Security Considerations

### IP-Based Lockout

**Note**: IP-based lockout can affect multiple users behind the same proxy/NAT. This is a known limitation and is acceptable for most use cases.

### Email Verification Bypass

**Note**: Email verification is recommended but not strictly enforced for all operations. Consider implementing stricter email verification for sensitive operations.

## Security Checklist

Before deploying to production:

- [ ] All secrets are strong (32+ characters) and unique
- [ ] `NODE_ENV=production` is set
- [ ] `LOG_LEVEL=warn` is set (reduces log verbosity)
- [ ] HSTS is enabled (`ENABLE_HSTS=true`)
- [ ] CORS is configured with production frontend URL only
- [ ] Database uses SSL/TLS connections
- [ ] Rate limiting is configured appropriately
- [ ] Audit logging is enabled and monitored
- [ ] Default passwords are changed
- [ ] MFA is enabled for superadmin (recommended)
- [ ] Security headers are configured
- [ ] Regular security audits are scheduled

## Additional Resources

- [Setup Guide](../01-setup/SETUP_GUIDE.md) - Initial setup and configuration
- [Deployment Guide](../04-deployment/RAILWAY_DEPLOYMENT.md) - Production deployment security
- [File Management](../03-file-management/CLOUDINARY_INTEGRATION_GUIDE.md) - Secure file uploads

