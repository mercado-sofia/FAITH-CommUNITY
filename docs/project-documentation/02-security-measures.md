# Security Measures

## Authentication & Authorization

### 1. Multi-Level Authentication System

**Public Users (Volunteers)**
- **Access Token**: Short-lived JWT (15 minutes)
- **Refresh Token**: Long-lived (7 days), stored in httpOnly cookie
- **Token Rotation**: Refresh tokens are rotated on each use
- **Email Verification**: Required before account activation
- **Password Requirements**: Enforced on backend

**Admin Users**
- **Access Token**: JWT with 30-minute expiration
- **Session Binding**: IP address and User-Agent fingerprinting
- **Session Storage**: Database-backed sessions with security binding
- **No 2FA**: Relies on strong passwords and rate limiting
- **Organization Scoping**: Admins can only access their organization's data

**Superadmin Users**
- **Access Token**: JWT with 30-minute expiration
- **Two-Factor Authentication (2FA)**: Optional TOTP-based 2FA
- **Session Binding**: IP address and User-Agent fingerprinting
- **Single Account**: Only one superadmin account (ID = 1) allowed
- **Hardcoded Token Support**: Special "superadmin" token for main account

### 2. Login Attempt Tracking & Rate Limiting

**Implementation Details:**
- **Failed Attempt Tracking**: Tracks only failed login attempts
- **Lockout Threshold**: 10 failed attempts within 5 minutes
- **Lockout Duration**: 5 minutes from first failed attempt
- **Warning Threshold**: Red warning appears when 3 attempts remain (at 7 failed attempts)
- **User Type Separation**: Separate tracking for user, admin, and superadmin
- **IP-Based Tracking**: Tracks attempts by IP address and identifier
- **Atomic Operations**: Uses database transactions to prevent race conditions
- **Automatic Cleanup**: Old attempts (>5 minutes) are automatically cleaned up

**Rate Limiting:**
- **Global Rate Limiting**: 500 requests per 15 minutes per IP
- **Auth Endpoint Limiting**: 10 requests per 15 minutes per IP
- **Public Endpoint Limiting**: 1000 requests per 15 minutes per IP
- **Slow Down Protection**: Progressive delays after threshold

### 3. Password Security

- **Hashing Algorithm**: bcrypt with 10-12 salt rounds
- **Password Change Notifications**: Email notifications on password changes
- **Password History**: Tracks password change timestamps
- **No Plain Text Storage**: All passwords are hashed before storage

### 4. Session Security

**Admin Sessions:**
- **Fingerprinting**: SHA-256 hash of IP address + User-Agent
- **Token Hashing**: Tokens stored as SHA-256 hashes in database
- **Expiration**: 30-minute session expiration
- **Security Violation Detection**: Sessions revoked on IP/UA mismatch
- **Session Revocation**: Ability to revoke individual or all sessions

**User Sessions:**
- **Refresh Token Storage**: httpOnly cookies (not accessible to JavaScript)
- **Token Rotation**: Refresh tokens rotated on each use
- **Revocation Support**: Tokens can be revoked individually or in bulk

### 5. CSRF Protection

- **Double-Submit Cookie Pattern**: Using `csrf-csrf` library
- **Token Generation**: CSRF tokens generated per request
- **Cookie-Based**: CSRF tokens stored in cookies
- **Protected Endpoints**: All state-changing operations protected

### 6. Security Headers (Helmet.js)

```javascript
- XSS Protection: Enabled
- Content Security Policy: Restricts script execution
- Frame Options: Prevents clickjacking (DENY)
- Referrer Policy: Strict-origin-when-cross-origin
- HSTS: Optional (enabled when ENABLE_HSTS=true)
- Permissions Policy: Restricts camera, microphone, geolocation, etc.
```

### 7. Input Validation & Sanitization

- **SQL Injection Prevention**: Parameterized queries for all database operations
- **JSON Validation**: All JSON inputs validated before processing
- **Email Format Validation**: RFC-compliant email validation
- **Input Sanitization**: DOMPurify for frontend XSS prevention

### 8. Email Security

**Email Change Process:**
- **OTP Verification**: 6-digit OTP sent to new email
- **Token-Based**: Secure token for email change confirmation
- **Expiration**: OTPs expire after 15 minutes
- **One-Time Use**: OTPs can only be used once
- **Current Email Verification**: Requires current password

**Password Reset:**
- **Token-Based**: Secure tokens with expiration
- **Single Use**: Tokens invalidated after use
- **Time-Limited**: Tokens expire after 1 hour

### 9. Audit Logging

**Logged Events:**
- Admin actions (create, update, delete operations)
- Superadmin actions (all administrative operations)
- Security events (failed logins, suspicious activity)
- Login attempts (successful and failed)

**Log Storage:**
- **audit_logs**: Admin and superadmin actions
- **security_logs**: Security-related events with severity levels
- **login_attempts**: Failed login attempt tracking

### 10. CORS Configuration

- **Origin Whitelist**: Configurable allowed origins via environment variables
- **Credentials**: Supports credentials (cookies, authorization headers)
- **Preflight Handling**: Proper OPTIONS request handling

### 11. Database Security

- **Connection Pooling**: Limits concurrent connections
- **SSL Support**: Optional SSL for production (Railway MySQL)
- **Prepared Statements**: All queries use parameterized statements
- **Transaction Support**: Critical operations use transactions
- **Connection Timeout**: 10-second connection timeout

### 12. File Upload Security

- **Cloudinary Integration**: Secure file uploads via Cloudinary
- **File Type Validation**: Validates file types before upload
- **Size Limits**: 10MB request body limit
- **Virus Scanning**: Handled by Cloudinary (if enabled)

---

**Back to [Main Documentation](../PROJECT_DOCUMENTATION.md)**

