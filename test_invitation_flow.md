# Admin Invitation System Test Guide

## Overview
This document provides a step-by-step guide to test the new admin invitation system.

## Prerequisites
1. Backend server running on `http://localhost:8080`
2. Frontend server running on `http://localhost:3000`
3. Superadmin account logged in
4. Email configuration set up in backend `.env` file

## Test Steps

### 1. Test Database Migration
1. Start the backend server
2. Check console logs for:
   - "Adding org and orgName columns to organizations table!"
   - "Data migration from admins to organizations completed!"
   - "admin_invitations table created successfully!"

### 2. Test Superadmin Invitation Flow
1. Navigate to `/superadmin/manageProfiles`
2. In the "Invite New Admin" section:
   - Enter a valid email address (e.g., `test@example.com`)
   - Click "Send Invitation"
3. Verify success message appears
4. Click "Show Invitations" to see pending invitations
5. Verify the invitation appears in the list with "Pending" status

### 3. Test Email Invitation
1. Check the email inbox for the invitation email
2. Verify the email contains:
   - Professional styling
   - "Accept Invitation" button
   - Invitation link with token
   - 7-day expiration notice

### 4. Test Invitation Acceptance
1. Click the invitation link in the email (or copy URL)
2. Verify the invitation acceptance page loads
3. Fill out the form:
   - Organization Acronym: `TEST`
   - Organization Name: `Test Organization`
   - Logo URL: `https://example.com/logo.png` (optional)
   - Password: `testpass123`
   - Confirm Password: `testpass123`
4. Click "Create Account"
5. Verify success message and redirect to admin login

### 5. Test Admin Login
1. Navigate to `/admin/login`
2. Login with:
   - Email: `test@example.com`
   - Password: `testpass123`
3. Verify successful login and admin dashboard access

### 6. Test Data Structure
1. Check database to verify:
   - `organizations` table has `org` and `orgName` columns
   - New organization record created with correct data
   - `admins` table has `organization_id` foreign key
   - `admin_invitations` table has the invitation record marked as "accepted"

### 7. Test Invitation Management
1. Go back to superadmin manage profiles
2. Verify the invitation is no longer in pending list
3. Test canceling a pending invitation
4. Verify invitation status changes to "expired"

## Expected Results

### Database Changes
- `organizations` table now has `org` and `orgName` columns
- `admin_invitations` table created with proper structure
- Data migrated from `admins` to `organizations` table

### Frontend Changes
- Manage profiles page now shows invitation form instead of direct creation
- Invitation management section with pending invitations list
- New invitation acceptance page at `/admin/invitation/accept`

### Backend Changes
- New invitation API endpoints:
  - `POST /api/invitations/send` - Send invitation
  - `GET /api/invitations/validate/:token` - Validate token
  - `POST /api/invitations/accept` - Accept invitation
  - `GET /api/invitations/` - Get all invitations
  - `PUT /api/invitations/cancel/:id` - Cancel invitation
- Email service integration for sending invitations
- Deprecated direct admin creation endpoint

## Troubleshooting

### Common Issues
1. **Email not sending**: Check email configuration in `.env`
2. **Token validation fails**: Check token expiration (7 days)
3. **Database errors**: Ensure migration ran successfully
4. **Frontend errors**: Check browser console for API errors

### Environment Variables Required
```
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password
FRONTEND_URL=http://localhost:3000
```

## Security Notes
- Invitation tokens are cryptographically secure
- Tokens expire after 7 days
- Email validation prevents duplicate invitations
- Password requirements enforced
- Organization acronym uniqueness enforced
