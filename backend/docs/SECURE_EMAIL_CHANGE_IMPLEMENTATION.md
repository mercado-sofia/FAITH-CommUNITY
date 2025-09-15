# Secure Email Change Implementation

## Overview
This document describes the implementation of a secure email change flow for all user roles (General Users, Admin, and Superadmin) in the FAITH CommUNITY application.

## Security Features Implemented

### 1. Multi-Step Verification Process
- **Step 1**: Current password verification
- **Step 2**: OTP verification sent to new email address
- **Optional Step**: 2FA verification for Superadmin accounts with MFA enabled

### 2. Email Notifications
- **New Email**: Receives OTP verification code
- **Old Email**: Receives security alert notification about the email change request

### 3. Security Validations
- Password verification before initiating email change
- Email format validation
- Duplicate email checking across all user types
- OTP expiration (15 minutes)
- Token-based verification system

## Backend Implementation

### 1. OTP System (`backend/back_end/utils/emailChangeOTP.js`)
- Generates 6-digit OTP codes
- Stores OTPs in database with expiration
- Sends professional email templates
- Automatic cleanup of expired OTPs

### 2. User Controllers Updated
- **General Users**: `backend/back_end/for_public/controllers/userController.js`
- **Admin Users**: `backend/back_end/admin/controllers/adminProfileController.js`
- **Superadmin Users**: `backend/back_end/superadmin/controllers/superadminAuthController.js`

### 3. New API Endpoints

#### General Users
- `POST /api/users/email/request-change` - Request email change with password verification
- `POST /api/users/email/verify-otp` - Verify OTP and complete email change

#### Admin Users
- `POST /api/admin/profile/email/request-change` - Request email change with password verification
- `POST /api/admin/profile/email/verify-otp` - Verify OTP and complete email change

#### Superadmin Users
- `POST /api/superadmin/auth/email/request-change/:id` - Request email change with password + optional 2FA verification
- `POST /api/superadmin/auth/email/verify-otp/:id` - Verify OTP and complete email change

### 4. Database Schema
```sql
CREATE TABLE email_change_otps (
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
);
```

## Frontend Implementation

### 1. General Users
- **Component**: `frontend/src/app/(public)/profile/NavTabs/EmailandPassword/ManageEmail/SecureEmailChange.js`
- **Features**: Two-step process with progress indicator, timer, and security notes

### 2. Admin Users
- **Component**: `frontend/src/app/admin/settings/ProfileSection/SecureEmailChangeModal.js`
- **Features**: Modal-based interface with same security features as general users

### 3. Superadmin Users
- **Component**: `frontend/src/app/superadmin/settings/ProfileSection/SecureEmailChangeModal.js`
- **Features**: Enhanced with 2FA support, MFA OTP field when 2FA is enabled

## Email Templates

### 1. OTP Verification Email
- Professional design with FAITH CommUNITY branding
- Clear 6-digit code display
- Security warnings and instructions
- 15-minute expiration notice

### 2. Security Alert Email
- Sent to current email address
- Warning about email change request
- Instructions for users who didn't request the change
- Professional security alert styling

## Security Measures

### 1. Password Verification
- Current password required before initiating email change
- Bcrypt comparison for secure password verification
- Prevents unauthorized email changes

### 2. OTP System
- 6-digit numeric codes
- 15-minute expiration
- Single-use tokens
- Secure random generation

### 3. 2FA Integration (Superadmin)
- TOTP verification for accounts with MFA enabled
- Additional security layer for high-privilege accounts
- Seamless integration with existing 2FA system

### 4. Email Validation
- Format validation
- Duplicate checking across all user types
- Prevents system abuse

### 5. Token Security
- Cryptographically secure tokens
- Database-stored with expiration
- Single-use verification

## User Experience Features

### 1. Progress Indicators
- Visual step progression
- Clear current step indication
- Professional UI design

### 2. Real-time Feedback
- Timer showing OTP expiration
- Field validation with error messages
- Loading states during API calls

### 3. Security Notifications
- Clear security warnings
- Instructions for users
- Professional email templates

### 4. Responsive Design
- Mobile-friendly interfaces
- Consistent styling across all user types
- Accessible form controls

## Testing Recommendations

### 1. Backend Testing
- Test OTP generation and expiration
- Verify email sending functionality
- Test password verification
- Validate 2FA integration for Superadmin

### 2. Frontend Testing
- Test form validation
- Verify modal functionality
- Test responsive design
- Validate error handling

### 3. Security Testing
- Test with expired OTPs
- Verify token security
- Test duplicate email prevention
- Validate 2FA requirements

### 4. Integration Testing
- End-to-end email change flow
- Cross-browser compatibility
- Mobile device testing
- Email delivery testing

## Configuration Requirements

### 1. Environment Variables
- SMTP configuration for email sending
- Database connection settings
- JWT secrets for authentication

### 2. Email Templates
- Customizable email templates
- Branding consistency
- Multi-language support (future enhancement)

## Future Enhancements

### 1. Additional Security
- Rate limiting for email change requests
- IP-based restrictions
- Audit logging for email changes

### 2. User Experience
- Email change history
- Multiple email addresses support
- Bulk email change notifications

### 3. Administrative Features
- Admin override capabilities
- Email change approval workflows
- Security monitoring dashboard

## Conclusion

The secure email change implementation provides a robust, user-friendly, and secure method for users to change their email addresses across all user roles. The multi-step verification process, combined with professional email templates and comprehensive security measures, ensures that email changes are both secure and user-friendly.

The implementation follows security best practices and provides a consistent experience across all user types while maintaining the specific security requirements for each role level.
