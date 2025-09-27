# Reset Password Bug Fix - Test Guide

## Problem Summary
The reset password functionality in the FAITH CommUNITY platform was only working for the admin authentication system, but the login page tries three different authentication systems (superadmin, admin, user). If an email exists in multiple tables, resetting the password only affected one system while login could succeed through another system with the old password.

## Solution Implemented
1. **Added reset password functionality to all three authentication systems:**
   - Superadmin: `/api/superadmin/auth/forgot-password` and `/api/superadmin/auth/reset-password`
   - Admin: `/api/admins/forgot-password` and `/api/admins/reset-password` (already existed)
   - User: `/api/users/forgot-password` and `/api/users/reset-password`

2. **Updated frontend to handle multiple authentication types:**
   - Reset password page now detects the user type from URL parameter (`?type=admin|superadmin|user`)
   - Calls the appropriate backend endpoint based on the type
   - Forgot password now sends reset emails to all authentication systems

3. **Enhanced reset links:**
   - Admin reset links now include `?type=admin`
   - Superadmin reset links include `?type=superadmin`
   - User reset links include `?type=user`

## Testing Steps

### 1. Test with Admin Account
1. Go to login page
2. Click "Forgot Password?"
3. Enter admin email
4. Check email for reset link
5. Click reset link (should include `?type=admin`)
6. Set new password
7. Try logging in with old password (should fail)
8. Try logging in with new password (should succeed)

### 2. Test with Superadmin Account
1. Go to login page
2. Click "Forgot Password?"
3. Enter superadmin email
4. Check email for reset link
5. Click reset link (should include `?type=superadmin`)
6. Set new password
7. Try logging in with old password (should fail)
8. Try logging in with new password (should succeed)

### 3. Test with User Account
1. Go to login page
2. Click "Forgot Password?"
3. Enter user email
4. Check email for reset link
5. Click reset link (should include `?type=user`)
6. Set new password
7. Try logging in with old password (should fail)
8. Try logging in with new password (should succeed)

### 4. Test with Email in Multiple Systems
1. Create an email that exists in multiple tables (admin, superadmin, user)
2. Go to login page
3. Click "Forgot Password?"
4. Enter the email
5. Check email for multiple reset links (one for each system)
6. Reset password for one system
7. Verify that login still works for other systems with old passwords
8. Reset passwords for all systems
9. Verify that old passwords no longer work for any system

## Expected Behavior
- Reset password should work for all authentication systems
- Old passwords should no longer work after reset
- Each authentication system should have its own reset link
- Login should only succeed with the correct password for the correct system

## Files Modified
- `backend/back_end/superadmin/controllers/superadminAuthController.js` - Added reset password functions
- `backend/back_end/superadmin/routes/superadminAuth.js` - Added reset password routes
- `backend/back_end/for_public/controllers/userController.js` - Added reset password functions
- `backend/back_end/for_public/routes/users.js` - Added reset password routes
- `backend/back_end/superadmin/controllers/adminController.js` - Updated reset link to include type
- `frontend/src/app/reset-password/page.js` - Added support for multiple authentication types
- `frontend/src/app/login/page.js` - Updated forgot password to try all systems

## Database Requirements
Make sure the `password_reset_tokens` table exists with the following structure:
```sql
CREATE TABLE password_reset_tokens (
  id INT AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(255) NOT NULL,
  token VARCHAR(255) NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```
