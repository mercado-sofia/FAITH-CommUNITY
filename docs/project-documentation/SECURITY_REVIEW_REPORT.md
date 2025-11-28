# Security Review Report - Cookie & Session Management

**Date:** 2024  
**Reviewer:** Security Audit  
**Scope:** Cookie management, session management, and authentication security

---

## Executive Summary

This security review examined the cookie management, session management, and authentication security measures in the FAITH CommUNITY platform. Overall, the system implements strong security practices with httpOnly cookies, token rotation, and session fingerprinting. However, several issues were identified that should be addressed to improve security and consistency.

**Overall Security Rating:** ⭐⭐⭐⭐ (4/5) - Good with room for improvement

---

## ✅ Strengths

### 1. Cookie Security
- ✅ **httpOnly Cookies**: Refresh tokens stored in httpOnly cookies (XSS protection)
- ✅ **Secure Flag**: Properly set for production and cross-domain scenarios
- ✅ **SameSite Policy**: Correctly configured (Lax for same-domain, None for cross-domain with Secure)
- ✅ **Domain Handling**: Sophisticated logic for handling different deployment scenarios (Vercel, Railway, localhost)

### 2. Token Management
- ✅ **Token Rotation**: Refresh tokens rotated on each use (prevents token reuse attacks)
- ✅ **Short-Lived Access Tokens**: 15-minute expiration limits exposure window
- ✅ **Token Hashing**: Admin/superadmin tokens stored as SHA-256 hashes in database

### 3. Session Security
- ✅ **Session Fingerprinting**: IP + User-Agent fingerprinting for admin/superadmin sessions
- ✅ **Automatic Revocation**: Sessions revoked on IP/UA mismatch
- ✅ **Database-Backed Sessions**: Admin/superadmin sessions stored in database with expiration

### 4. Authentication Security
- ✅ **Password Hashing**: bcrypt with 10-12 salt rounds
- ✅ **Login Attempt Tracking**: Prevents brute force attacks (10 attempts, 5-minute lockout)
- ✅ **2FA Support**: TOTP-based 2FA for superadmin accounts
- ✅ **Unified Refresh System**: Single endpoint handles all roles

---

## ⚠️ Issues Found

### 🔴 Critical Issues

#### 1. **Transaction Handling in Token Rotation** (Medium-High Priority)
**Location:** `backend/src/utils/jwt.js:34-48`

**Issue:**
```javascript
export async function rotateRefreshToken(oldToken, userId, { userAgent, ipAddress } = {}) {
  const connection = await db.getConnection?.() || null
  try {
    if (connection) await connection.beginTransaction()
    // ... operations
    if (connection) await connection.commit()
  } catch (e) {
    if (connection) await connection.rollback()
    throw e
  }
}
```

**Problem:**
- Optional chaining (`?.`) suggests uncertainty about `getConnection` existence
- If `getConnection` returns `null`, operations run without transaction protection
- Token rotation should be atomic to prevent race conditions

**Impact:** Potential race conditions during token rotation could lead to:
- Multiple valid refresh tokens for the same user
- Token reuse vulnerabilities
- Inconsistent database state

**Recommendation:**
```javascript
export async function rotateRefreshToken(oldToken, userId, { userAgent, ipAddress } = {}) {
  const connection = await db.getConnection()
  try {
    await connection.beginTransaction()
    
    // Validate old token first
    const [rows] = await connection.execute(
      `SELECT * FROM refresh_tokens 
       WHERE token = ? AND user_id = ? AND revoked_at IS NULL AND expires_at > NOW()`,
      [oldToken, userId]
    )
    
    if (rows.length === 0) {
      await connection.rollback()
      throw new Error('Invalid or expired refresh token')
    }
    
    // Revoke old token
    await connection.execute(
      `UPDATE refresh_tokens SET revoked_at = NOW() WHERE token = ? AND user_id = ?`,
      [oldToken, userId]
    )
    
    // Issue new token
    const { token, expiresAt } = await issueRefreshToken(userId, { userAgent, ipAddress })
    
    await connection.commit()
    return { token, expiresAt }
  } catch (e) {
    await connection.rollback()
    throw e
  } finally {
    connection.release()
  }
}
```

**Status:** 🔴 Needs Fix

---

#### 2. **Missing Session Cleanup on Logout** (Medium Priority)
**Location:** `backend/src/(public)/controllers/userController.js:986-1010`

**Issue:**
The unified logout endpoint (`/api/users/logout`) revokes refresh tokens but does NOT revoke admin/superadmin sessions from the `admin_sessions` table.

**Current Code:**
```javascript
export const logoutUser = async (req, res) => {
  try {
    const userId = req.user?.id || req.admin?.id || req.superadmin?.id;
    
    if (userId) {
      await db.query('UPDATE users SET last_login = NOW() WHERE id = ?', [userId]);
    }

    const presented = req.cookies?.refresh_token
    if (presented) {
      await revokeRefreshToken(presented)
    }

    const clearCookieOptions = getClearCookieOptions(req);
    res.clearCookie('access_token', clearCookieOptions)
    res.clearCookie('refresh_token', clearCookieOptions)

    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};
```

**Problem:**
- Admin/superadmin sessions remain in `admin_sessions` table after logout
- Sessions can still be used until they expire (30 minutes)
- Security violation: logged-out users' sessions remain valid

**Recommendation:**
```javascript
export const logoutUser = async (req, res) => {
  try {
    const userId = req.user?.id || req.admin?.id || req.superadmin?.id;
    const role = req.user?.role || req.admin?.role || req.superadmin?.role;
    
    if (userId) {
      await db.query('UPDATE users SET last_login = NOW() WHERE id = ?', [userId]);
      
      // Revoke admin/superadmin sessions
      if (role === 'admin' || role === 'superadmin') {
        const { SessionSecurity } = await import('../../utils/sessionSecurity.js');
        await SessionSecurity.revokeAllAdminSessions(userId);
      }
    }

    const presented = req.cookies?.refresh_token
    if (presented) {
      await revokeRefreshToken(presented)
    }

    const clearCookieOptions = getClearCookieOptions(req);
    res.clearCookie('access_token', clearCookieOptions)
    res.clearCookie('refresh_token', clearCookieOptions)

    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};
```

**Status:** 🔴 Needs Fix

---

### ✅ Resolved: Access Token Storage Strategy

#### 3. **Access Token Storage** (Resolved - Cookies are Correct)
**Location:** Multiple locations set `access_token` as cookie

**Decision:** Access tokens remain in httpOnly cookies (current implementation is correct and secure)

**Rationale:**
- ✅ **XSS Protection**: httpOnly cookies are not accessible to JavaScript, preventing token theft via XSS
- ✅ **CSRF Mitigation**: Double-submit cookie pattern already implemented for CSRF protection
- ✅ **Simpler Implementation**: Automatic cookie sending reduces frontend complexity
- ✅ **Short-Lived Tokens**: Access tokens expire in 15 minutes, limiting exposure window
- ✅ **Refresh Token Security**: Long-lived refresh tokens already in secure httpOnly cookies

**Current Implementation:**
- Access tokens stored in httpOnly cookies (XSS protected)
- CSRF protection via double-submit cookie pattern
- Backend middleware supports both cookies and Authorization headers for flexibility
- Documentation updated to reflect cookie-based storage

**Status:** ✅ Resolved - Cookies are the correct approach for this security model

---

#### 4. **CSRF Cookie Configuration** (Fixed)
**Location:** `backend/src/utils/csrf.js`

**Issue:**
CSRF cookie used simple env check, not the sophisticated cross-domain detection used for auth cookies.

**Fix Applied:**
- Created shared utility file `backend/src/utils/cookieUtils.js` with cross-domain detection logic
- Updated CSRF cookie configuration to use shared utility functions
- Updated JWT cookie options to also use shared utility for consistency
- All cookies now use the same cross-domain detection logic

**Status:** ✅ Fixed

---

#### 5. **Missing Session Cleanup Job**
**Location:** No scheduled cleanup job found

**Issue:**
- Expired sessions in `admin_sessions` table are not automatically cleaned up
- `cleanExpiredSessions()` method exists but is never called
- Database will accumulate expired session records

**Recommendation:**
Add a scheduled job (cron or interval) to clean up expired sessions:
```javascript
// In app.js or a separate cleanup service
setInterval(async () => {
  try {
    await SessionSecurity.cleanExpiredSessions();
    await db.execute('DELETE FROM refresh_tokens WHERE expires_at < NOW() OR revoked_at IS NOT NULL');
  } catch (error) {
    logError('Session cleanup failed', error);
  }
}, 60 * 60 * 1000); // Run every hour
```

**Status:** 🟡 Needs Implementation

---

### 🟢 Low Priority / Recommendations

#### 6. **Refresh Token Validation Before Rotation**
**Location:** `backend/src/utils/jwt.js:rotateRefreshToken()`

**Recommendation:**
Validate the old token exists and is valid BEFORE revoking it. Currently, the validation happens in `findValidRefreshToken()` before calling `rotateRefreshToken()`, but it should also be checked inside the transaction.

**Status:** 🟢 Enhancement

---

#### 7. **Cookie SameSite Detection Logic**
**Location:** `backend/src/utils/jwt.js:getAccessTokenCookieOptions()`

**Current Logic:**
```javascript
const isCrossDomain = req && req.headers && req.headers.origin && req.headers.host && 
  req.headers.origin !== `https://${req.headers.host}` && 
  req.headers.origin !== `http://${req.headers.host}`;
```

**Recommendation:**
This logic is good but could be more robust. Consider:
- Handling `x-forwarded-proto` header for proxy scenarios
- More explicit origin comparison
- Logging when cross-domain is detected (for debugging)

**Status:** 🟢 Enhancement

---

#### 8. **Session Expiration Mismatch**
**Location:** `backend/src/utils/sessionSecurity.js:14`

**Issue:**
- Database session records expire in 30 minutes
- JWT access tokens expire in 15 minutes
- This mismatch could cause confusion

**Current Behavior:**
- Access token expires → User must refresh
- Session record still valid for 15 more minutes
- If user refreshes, new session created with new 30-minute expiration

**Recommendation:**
Consider aligning expiration times or documenting the rationale for the mismatch.

**Status:** 🟢 Documentation

---

## 📋 Security Checklist

### Cookie Management
- [x] httpOnly flag set
- [x] Secure flag set for production
- [x] SameSite policy configured correctly
- [x] Domain handling for different deployment scenarios
- [x] Cookie clearing on logout
- [ ] Access token storage strategy (cookie vs localStorage) - needs decision
- [ ] CSRF cookie configuration consistency

### Session Management
- [x] Database-backed sessions for admin/superadmin
- [x] Session fingerprinting (IP + User-Agent)
- [x] Automatic session revocation on security violation
- [ ] Session cleanup on logout - **NEEDS FIX**
- [ ] Scheduled cleanup job for expired sessions - **NEEDS IMPLEMENTATION**

### Token Management
- [x] Token rotation implemented
- [x] Token hashing for database storage
- [x] Short-lived access tokens
- [ ] Transaction handling in token rotation - **NEEDS FIX**
- [x] Token validation before rotation

### Authentication Security
- [x] Password hashing (bcrypt)
- [x] Login attempt tracking
- [x] Account lockout mechanism
- [x] 2FA support for superadmin
- [x] Email verification

---

## 🔧 Recommended Actions

### Immediate (Critical)
1. **Fix transaction handling in `rotateRefreshToken()`**
   - Remove optional chaining
   - Ensure atomic operations
   - Add proper error handling

2. **Add session cleanup on logout**
   - Revoke admin/superadmin sessions in unified logout endpoint
   - Ensure all sessions are properly cleaned up

### Short-term (Medium Priority)
3. **Decide on access token storage strategy**
   - Choose: localStorage only OR cookie-based
   - Update code and documentation to match

4. **Fix CSRF cookie configuration**
   - Use same cross-domain detection logic as auth cookies
   - Ensure consistency across all cookie settings

5. **Implement session cleanup job**
   - Add scheduled cleanup for expired sessions
   - Clean up expired refresh tokens

### Long-term (Enhancements)
6. **Improve cookie SameSite detection**
   - Handle proxy headers better
   - Add logging for debugging

7. **Align session expiration times**
   - Document rationale or align times
   - Consider making expiration configurable

---

## 📊 Code Quality Observations

### Positive
- ✅ Well-documented security measures
- ✅ Consistent use of helper functions for cookie options
- ✅ Good separation of concerns (utils, controllers, middleware)
- ✅ Comprehensive security documentation

### Areas for Improvement
- ⚠️ Some inconsistencies between documentation and implementation
- ⚠️ Optional chaining suggests uncertainty about API
- ⚠️ Missing error handling in some edge cases
- ⚠️ No automated cleanup jobs

---

## 🎯 Conclusion

The FAITH CommUNITY platform has a solid security foundation with good practices for cookie management, session security, and authentication. The main issues are:

1. **Transaction handling** needs to be more robust
2. **Session cleanup** on logout is incomplete
3. **Access token storage** strategy needs to be decided and consistently implemented

Addressing these issues will significantly improve the security posture of the system. The recommended fixes are straightforward and should be implemented as soon as possible.

---

## 📝 Notes

- All cookie operations use the `getClearCookieOptions()` helper, which is good for consistency
- The cross-domain detection logic is sophisticated and handles multiple deployment scenarios
- Token rotation is implemented correctly but needs better transaction handling
- Session fingerprinting is a strong security feature that should be maintained

---

**Review Completed:** 2024  
**Next Review Recommended:** After implementing critical fixes

