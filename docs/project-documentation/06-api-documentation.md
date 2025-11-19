# API Documentation

## Overview
The FAITH CommUNITY API follows RESTful principles and uses JWT-based authentication. All endpoints return JSON responses. The API is organized into four main categories: Public, User, Admin, and Superadmin.

## Base URL
- **Development**: `http://localhost:8080`
- **Production**: Configured via `BACKEND_URL` environment variable

## Authentication
- **Public Endpoints**: No authentication required
- **User Endpoints**: Requires `Authorization: Bearer <user_token>` header
- **Admin Endpoints**: Requires `Authorization: Bearer <admin_token>` header
- **Superadmin Endpoints**: Requires `Authorization: Bearer <superadmin_token>` header

## Response Format
All API responses follow this structure:
```json
{
  "success": true|false,
  "message": "Response message",
  "data": { ... }
}
```

## Error Responses
```json
{
  "success": false,
  "error": "Error message",
  "code": "ERROR_CODE"
}
```

---

## Public APIs (No Authentication Required)

### Health Check
- **GET** `/api/health` - Check API health status

### Organizations
- **GET** `/api/organizations` - Get all organizations
- **GET** `/api/hero-section` - Get hero section data
- **GET** `/api/organization-advisers` - Get approved organization advisers

### Programs
- **GET** `/api/programs` - Get all approved programs
- **GET** `/api/programs/featured` - Get featured programs
- **GET** `/api/programs/org/:orgId` - Get approved programs by organization
- **GET** `/api/programs/slug/:slug` - Get program by slug
- **GET** `/api/programs/org/:organizationId/other/:excludeProgramId` - Get related programs by organization

### News
- **GET** `/api/news` - Get all approved news
- **GET** `/api/news/approved` - Get all approved news
- **GET** `/api/news/approved/:orgId` - Get approved news by organization
- **GET** `/api/news/slug/:slug` - Get news by slug
- **GET** `/api/news/:id` - Get news by ID

### Highlights
- **GET** `/api/highlights/public/approved` - Get all approved highlights
- **GET** `/api/highlights/public/featured` - Get featured highlights

### Subscription
- **POST** `/api/subscription/subscribe` - Subscribe to newsletter
- **GET** `/api/subscription/confirm` - Confirm subscription
- **GET** `/api/subscription/confirm/:token` - Confirm subscription with token
- **GET** `/api/subscription/unsubscribe/:token` - Unsubscribe from newsletter

### Messages
- **POST** `/api/messages` - Submit a message from public portal

### CSRF Token
- **GET** `/api/csrf-token` - Get CSRF token for protected requests

### Branding (Public)
- **GET** `/api/superadmin/branding/public` - Get public branding data
- **GET** `/api/superadmin/branding/site-name/public` - Get public site name

### About Us (Public)
- **GET** `/api/superadmin/about-us/public` - Get public about us data

### Mission & Vision (Public)
- **GET** `/api/mission-vision` - Get mission and vision

### Footer (Public)
- **GET** `/api/superadmin/footer` - Get footer content

### FAQs (Public)
- **GET** `/api/faqs/active` - Get active FAQs

### Heads of FACES (Public)
- **GET** `/api/superadmin/heads-faces` - Get heads of FACES
- **GET** `/api/superadmin/heads-faces/:id` - Get head by ID

---

## User APIs (User Authentication Required)

### Authentication
- **POST** `/api/users/register` - Register new user
- **POST** `/api/users/login` - Login user
- **POST** `/api/users/logout` - Logout user (requires auth)
- **POST** `/api/users/refresh` - Refresh access token
- **GET** `/api/users/auth/check` - Check authentication status (unified for all roles)
- **POST** `/api/users/forgot-password` - Request password reset
- **POST** `/api/users/reset-password` - Reset password with token
- **POST** `/api/users/validate-reset-token` - Validate password reset token
- **POST** `/api/users/check-email` - Check if email exists
- **GET** `/api/users/verify-email` - Verify email address
- **POST** `/api/users/resend-verification` - Resend verification email

### Profile Management
- **GET** `/api/users/profile` - Get user profile
- **PUT** `/api/users/profile` - Update user profile
- **POST** `/api/users/profile/photo` - Upload profile photo
- **DELETE** `/api/users/profile/photo` - Remove profile photo

### Email Management
- **POST** `/api/users/email/request-change` - Request email change
- **POST** `/api/users/email/verify-otp` - Verify email change OTP

### Password Management
- **PUT** `/api/users/password` - Change password

### Account Management
- **POST** `/api/users/delete-account` - Delete user account

### Newsletter
- **POST** `/api/users/newsletter/subscribe` - Subscribe to newsletter
- **POST** `/api/users/newsletter/unsubscribe` - Unsubscribe from newsletter
- **GET** `/api/users/newsletter/status` - Get newsletter subscription status

### Notifications
- **GET** `/api/users/notifications` - Get user notifications
- **GET** `/api/users/notifications/unread-count` - Get unread notification count
- **PUT** `/api/users/notifications/:notificationId/read` - Mark notification as read
- **PUT** `/api/users/notifications/mark-all-read` - Mark all notifications as read
- **DELETE** `/api/users/notifications/:notificationId` - Delete notification

### Applications
- **GET** `/api/users/applications` - Get user's applications
- **GET** `/api/users/applications/:id` - Get application details
- **PUT** `/api/users/applications/:id/cancel` - Cancel application
- **PUT** `/api/users/applications/:id/complete` - Complete application
- **DELETE** `/api/users/applications/:id` - Delete application

### Volunteer Applications
- **POST** `/api/apply` - Submit volunteer application
- **GET** `/api/programs/approved/upcoming` - Get approved upcoming programs

---

## Admin APIs (Admin Authentication Required)

### Authentication
- **POST** `/api/admins/login` - Login admin
- **POST** `/api/admins/forgot-password` - Request password reset
- **POST** `/api/admins/reset-password` - Reset password with token
- **POST** `/api/admins/validate-reset-token` - Validate password reset token
- **POST** `/api/admins/check-email` - Check if email exists

### Admin Management (Superadmin Only)
- **GET** `/api/admins` - Get all admins
- **GET** `/api/admins/:id` - Get admin by ID
- **PUT** `/api/admins/:id` - Update admin
- **PUT** `/api/admins/:id/deactivate` - Deactivate admin
- **DELETE** `/api/admins/:id` - Delete admin
- **POST** `/api/admins/:id/verify-password` - Verify password for email change
- **POST** `/api/admins/:id/verify-password-change` - Verify password for password change

### Profile Management
- **GET** `/api/admin/profile` - Get admin profile
- **PUT** `/api/admin/profile` - Update admin profile
- **POST** `/api/admin/profile/email/request-change` - Request email change
- **POST** `/api/admin/profile/email/verify-otp` - Verify email change OTP
- **PUT** `/api/admin/profile/password` - Update password
- **POST** `/api/admin/profile/verify-password-email` - Verify password for email change

### Organization Management
- **GET** `/api/organization/org/:org_name` - Get organization by name/acronym
- **GET** `/api/organization/:id` - Get organization by ID
- **POST** `/api/organization` - Create new organization
- **PUT** `/api/organization/:id` - Update organization
- **GET** `/api/organization/check-acronym/:acronym` - Check if acronym exists
- **GET** `/api/organization/check-name/:name` - Check if name exists

### Programs Management
- **GET** `/api/admin/programs` - Get admin's programs
- **GET** `/api/admin/programs/:orgId` - Get programs by organization
- **GET** `/api/admin/programs/single/:id` - Get program by ID
- **PUT** `/api/admin/programs/:id` - Update program
- **PUT** `/api/admin/programs/:id/mark-active` - Mark program as active
- **PUT** `/api/admin/programs/:id/toggle-volunteers` - Toggle volunteer acceptance
- **POST** `/api/admin/programs/:id/post-act-report` - Upload post-act report
- **DELETE** `/api/admin/programs/:id` - Delete program submission
- **PUT** `/api/program-projects/:id` - Update program project
- **GET** `/api/program-projects` - Get program projects

### Submissions
- **POST** `/api/submissions` - Create new submission
- **GET** `/api/submissions/details/:id` - Get submission by ID
- **PUT** `/api/submissions/:id` - Update pending submission
- **DELETE** `/api/submissions/:id` - Cancel pending submission
- **POST** `/api/submissions/bulk-delete` - Bulk delete submissions
- **GET** `/api/submissions/:orgAcronym` - Get submissions by organization acronym

### Volunteers Management
- **POST** `/api/volunteers` - Apply as volunteer
- **GET** `/api/volunteers` - Get all volunteers
- **GET** `/api/volunteers/:id` - Get volunteer by ID
- **GET** `/api/volunteers/organization/:orgId` - Get volunteers by organization
- **GET** `/api/volunteers/admin/:adminId` - Get volunteers by admin organization
- **GET** `/api/volunteers/program/:programId` - Get volunteers by program
- **PUT** `/api/volunteers/:id/status` - Update volunteer status
- **PUT** `/api/volunteers/:id/soft-delete` - Soft delete volunteer

### News Management
- **POST** `/api/news/:orgId` - Create news for organization
- **GET** `/api/news/org/:orgId` - Get news by organization
- **GET** `/api/news/deleted/:orgId` - Get recently deleted news
- **PATCH** `/api/news/restore/:id` - Restore deleted news
- **DELETE** `/api/news/permanent/:id` - Permanently delete news
- **PUT** `/api/news/:id` - Update news
- **DELETE** `/api/news/:id` - Delete news submission

### Highlights Management
- **GET** `/api/admin/highlights` - Get admin's highlights
- **GET** `/api/admin/highlights/:id` - Get highlight by ID
- **POST** `/api/admin/highlights` - Create highlight
- **PUT** `/api/admin/highlights/:id` - Update highlight
- **DELETE** `/api/admin/highlights/:id` - Delete highlight
- **GET** `/api/admin/highlights/featured` - Get featured highlights
- **GET** `/api/admin/highlights/:id/featured` - Check featured status
- **POST** `/api/admin/highlights/:id/feature` - Add to featured
- **POST** `/api/admin/highlights/:id/unfeature` - Remove from featured

### Advocacies
- **GET** `/api/advocacies` - Get all advocacies
- **GET** `/api/advocacies/:organization_id` - Get advocacies by organization
- **POST** `/api/advocacies` - Create/update advocacy
- **DELETE** `/api/advocacies/:id` - Delete advocacy

### Competencies
- **GET** `/api/competencies` - Get all competencies
- **GET** `/api/competencies/:organization_id` - Get competencies by organization
- **POST** `/api/competencies` - Create/update competency
- **DELETE** `/api/competencies/:id` - Delete competency

### Organization Heads
- **GET** `/api/heads/:organization_id` - Get heads by organization
- **POST** `/api/heads` - Create new head
- **PUT** `/api/heads/bulk` - Bulk update heads
- **PUT** `/api/heads/reorder` - Reorder heads
- **DELETE** `/api/heads/bulk` - Bulk delete heads
- **PUT** `/api/heads/:id` - Update head by ID
- **DELETE** `/api/heads/:id` - Delete head by ID

### Collaborations
- **GET** `/api/collaborations/available-admins` - Get all available admins
- **GET** `/api/collaborations/programs/:programId/available-admins` - Get available admins for program
- **POST** `/api/collaborations/programs/:programId/invite-collaborator` - Invite collaborator
- **GET** `/api/collaborations/programs/:programId/collaborators` - Get program collaborators
- **DELETE** `/api/collaborations/programs/:programId/collaborators/:adminId` - Remove collaborator
- **PUT** `/api/collaborations/collaborations/:collaborationId/opt-out` - Opt out of collaboration
- **GET** `/api/collaborations/collaboration-requests` - Get collaboration requests
- **PUT** `/api/collaborations/collaborations/:collaborationId/accept` - Accept collaboration request
- **PUT** `/api/collaborations/collaborations/:collaborationId/decline` - Decline collaboration request

### Notifications
- **GET** `/api/notifications/:adminId` - Get admin notifications
- **GET** `/api/notifications/:adminId/unread-count` - Get unread notification count
- **PUT** `/api/notifications/:notificationId/read` - Mark notification as read
- **PUT** `/api/notifications/:adminId/mark-all-read` - Mark all notifications as read
- **DELETE** `/api/notifications/:notificationId` - Delete notification

### Inbox
- **GET** `/api/inbox/:organization_id` - Get messages for organization
- **GET** `/api/inbox/:organization_id/unread-count` - Get unread message count
- **PATCH** `/api/inbox/:message_id/read` - Mark message as read
- **PATCH** `/api/inbox/:organization_id/mark-all-read` - Mark all messages as read
- **DELETE** `/api/inbox/:message_id` - Delete message

### Subscribers
- **POST** `/api/subscribers` - Subscribe to newsletter
- **GET** `/api/subscribers/verify` - Verify subscription
- **GET** `/api/subscribers/unsubscribe` - Unsubscribe from newsletter
- **POST** `/api/subscribers/notify` - Notify subscribers (consider protecting this endpoint)

### File Uploads
- **POST** `/api/upload` - Generic file upload (requires `?type=highlight|program` query param)
- **POST** `/api/upload/public/organization-logo` - Public organization logo upload

---

## Superadmin APIs (Superadmin Authentication Required)

### Authentication
- **POST** `/api/superadmin/auth/login` - Login superadmin
- **POST** `/api/superadmin/auth/forgot-password` - Request password reset
- **POST** `/api/superadmin/auth/reset-password` - Reset password with token
- **POST** `/api/superadmin/auth/validate-reset-token` - Validate password reset token
- **POST** `/api/superadmin/auth/check-email` - Check if email exists
- **POST** `/api/superadmin/auth/initialize` - Initialize superadmin (protected by secret key)

### Profile Management
- **GET** `/api/superadmin/auth/profile/:id` - Get superadmin profile
- **POST** `/api/superadmin/auth/verify-password/:id` - Verify password
- **POST** `/api/superadmin/auth/email/request-change/:id` - Request email change
- **POST** `/api/superadmin/auth/email/verify-otp/:id` - Verify email change OTP
- **PUT** `/api/superadmin/auth/email/:id` - Update email
- **PUT** `/api/superadmin/auth/password/:id` - Update password

### Two-Factor Authentication (2FA)
- **POST** `/api/superadmin/auth/2fa/setup/:id` - Setup 2FA
- **POST** `/api/superadmin/auth/2fa/verify/:id` - Verify 2FA
- **POST** `/api/superadmin/auth/2fa/disable/:id` - Disable 2FA

### Approvals
- **GET** `/api/approvals` - Get all submissions
- **GET** `/api/approvals/pending` - Get pending submissions
- **PUT** `/api/approvals/:id/approve` - Approve submission
- **PUT** `/api/approvals/:id/reject` - Reject submission
- **DELETE** `/api/approvals/:id/delete` - Delete submission
- **POST** `/api/approvals/bulk/approve` - Bulk approve submissions
- **POST** `/api/approvals/bulk/reject` - Bulk reject submissions
- **POST** `/api/approvals/bulk/delete` - Bulk delete submissions

### Highlights Approval
- **GET** `/api/admin/highlights/approval/all` - Get all highlights for approval
- **PUT** `/api/admin/highlights/approval/:id/status` - Update highlight approval status

### Programs Management (Superadmin)
- **GET** `/api/program-projects/superadmin/all` - Get all programs for superadmin
- **GET** `/api/program-projects/superadmin/statistics` - Get programs statistics
- **GET** `/api/superadmin/featured-projects` - Get all featured programs
- **PUT** `/api/superadmin/programs/:id/featured` - Toggle featured status
- **GET** `/api/projects/superadmin/all` - Get all programs by organization
- **GET** `/api/projects/superadmin/statistics` - Get programs statistics
- **GET** `/api/projects/superadmin/completion-trends` - Get program completion trends
- **GET** `/api/projects/superadmin/top-organizations` - Get top organizations by program count
- **GET** `/api/projects/superadmin/organization/:orgId` - Get programs by organization ID
- **GET** `/api/projects/superadmin/:id` - Get program by ID

### Branding
- **GET** `/api/superadmin/branding` - Get branding data
- **PUT** `/api/superadmin/branding` - Update branding
- **POST** `/api/superadmin/branding/upload-logo` - Upload logo
- **POST** `/api/superadmin/branding/upload-favicon` - Upload favicon
- **DELETE** `/api/superadmin/branding/logo` - Delete logo
- **DELETE** `/api/superadmin/branding/favicon` - Delete favicon
- **POST** `/api/superadmin/branding/upload-name` - Upload name image
- **DELETE** `/api/superadmin/branding/name` - Delete name image
- **GET** `/api/superadmin/branding/site-name` - Get site name
- **PUT** `/api/superadmin/branding/site-name` - Update site name

### Hero Section
- **GET** `/api/superadmin/hero-section` - Get hero section data
- **PUT** `/api/superadmin/hero-section` - Update entire hero section
- **PUT** `/api/superadmin/hero-section/text` - Update text content
- **PUT** `/api/superadmin/hero-section/image-text` - Update image text content
- **POST** `/api/superadmin/hero-section/upload-video` - Upload video
- **PUT** `/api/superadmin/hero-section/video-link` - Update video link
- **POST** `/api/superadmin/hero-section/upload-image` - Upload image
- **DELETE** `/api/superadmin/hero-section/video` - Delete video
- **DELETE** `/api/superadmin/hero-section/image/:imageId` - Delete image

### About Us
- **GET** `/api/superadmin/about-us` - Get about us data
- **PUT** `/api/superadmin/about-us` - Update about us
- **POST** `/api/superadmin/about-us/extension-categories` - Add extension category
- **PUT** `/api/superadmin/about-us/extension-categories/:categoryIndex` - Update extension category
- **DELETE** `/api/superadmin/about-us/extension-categories/:categoryIndex` - Delete extension category
- **POST** `/api/superadmin/about-us/upload-image` - Upload about us image
- **DELETE** `/api/superadmin/about-us/image` - Delete about us image

### Mission & Vision
- **POST** `/api/mission-vision` - Create/update mission and vision
- **PUT** `/api/mission-vision/:id` - Update mission or vision
- **DELETE** `/api/mission-vision/:id` - Delete mission or vision

### Footer
- **PUT** `/api/superadmin/footer/contact` - Update contact information
- **PUT** `/api/superadmin/footer/social-media` - Update social media links
- **PUT** `/api/superadmin/footer/copyright` - Update copyright text
- **GET** `/api/superadmin/footer/services` - Get services
- **POST** `/api/superadmin/footer/services` - Add service
- **PUT** `/api/superadmin/footer/services/:id` - Update service
- **DELETE** `/api/superadmin/footer/services/:id` - Delete service

### FAQs
- **GET** `/api/faqs` - Get all FAQs
- **GET** `/api/faqs/:id` - Get FAQ by ID
- **POST** `/api/faqs` - Create FAQ
- **PUT** `/api/faqs/:id` - Update FAQ
- **DELETE** `/api/faqs/:id` - Delete FAQ

### Subscriptions
- **POST** `/api/subscriptions` - Create subscription
- **GET** `/api/subscriptions` - Get all subscriptions

### Notifications
- **GET** `/api/superadmin/notifications/:superAdminId` - Get superadmin notifications
- **GET** `/api/superadmin/notifications/:superAdminId/unread-count` - Get unread count
- **PUT** `/api/superadmin/notifications/:notificationId/read` - Mark notification as read
- **PUT** `/api/superadmin/notifications/:superAdminId/mark-all-read` - Mark all notifications as read
- **DELETE** `/api/superadmin/notifications/:notificationId` - Delete notification

### Invitations
- **GET** `/api/invitations/validate/:token` - Validate invitation token (public)
- **POST** `/api/invitations/accept` - Accept invitation (public)
- **POST** `/api/invitations/send` - Send invitation
- **GET** `/api/invitations` - Get all invitations
- **PUT** `/api/invitations/cancel/:id` - Cancel invitation
- **PUT** `/api/invitations/deactivate/:id` - Deactivate admin from invitation
- **DELETE** `/api/invitations/:id` - Delete invitation

### Heads of FACES
- **POST** `/api/superadmin/heads-faces` - Create heads of FACES
- **PUT** `/api/superadmin/heads-faces/:id` - Update heads of FACES
- **POST** `/api/superadmin/heads-faces/manage` - Create or update single head
- **POST** `/api/superadmin/heads-faces/upload-image` - Upload head image

---

## API Rate Limiting

### Global Rate Limits
- **Global**: 500 requests per 15 minutes per IP
- **Auth Endpoints**: 10 requests per 15 minutes per IP
- **Public Endpoints**: 1000 requests per 15 minutes per IP

### Rate Limit Headers
Responses include rate limit information:
- `X-RateLimit-Limit`: Maximum requests allowed
- `X-RateLimit-Remaining`: Remaining requests in window
- `X-RateLimit-Reset`: Time when limit resets

### Rate Limit Exceeded Response
```json
{
  "success": false,
  "message": "Too many requests, please try again later.",
  "retryAfter": "15 minutes"
}
```

---

## API Error Codes

### Common HTTP Status Codes
- **200 OK**: Request successful
- **201 Created**: Resource created successfully
- **400 Bad Request**: Invalid request data
- **401 Unauthorized**: Authentication required or invalid token
- **403 Forbidden**: Insufficient permissions
- **404 Not Found**: Resource not found
- **409 Conflict**: Resource conflict (e.g., duplicate email)
- **422 Unprocessable Entity**: Validation error
- **429 Too Many Requests**: Rate limit exceeded
- **500 Internal Server Error**: Server error

### Common Error Codes
- `INVALID_CREDENTIALS`: Invalid email or password
- `TOKEN_EXPIRED`: Access token expired
- `TOKEN_INVALID`: Invalid access token
- `EMAIL_EXISTS`: Email already registered
- `EMAIL_NOT_VERIFIED`: Email not verified
- `ACCOUNT_LOCKED`: Account locked due to failed login attempts
- `VALIDATION_ERROR`: Request validation failed
- `NOT_FOUND`: Resource not found
- `UNAUTHORIZED`: Insufficient permissions

---

**Back to [Main Documentation](../PROJECT_DOCUMENTATION.md)**