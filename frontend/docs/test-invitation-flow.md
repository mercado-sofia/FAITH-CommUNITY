# Admin Invitation Flow Test Guide

## Overview
This guide helps test the admin invitation system after the recent fixes.

## Test Steps

### 1. Backend API Test
Test the invitation endpoints directly:

```bash
# Test token validation endpoint
curl -X GET "http://localhost:8080/api/invitations/validate/YOUR_TOKEN_HERE"

# Test invitation acceptance endpoint
curl -X POST "http://localhost:8080/api/invitations/accept" \
  -H "Content-Type: application/json" \
  -d '{
    "token": "YOUR_TOKEN_HERE",
    "org": "TEST",
    "orgName": "Test Organization",
    "logo": "test-logo.jpg",
    "password": "TestPassword123"
  }'
```

### 2. Frontend Test
1. **Start the development server:**
   ```bash
   cd frontend
   npm run dev
   ```

2. **Test invitation link:**
   - Use a valid invitation token in the URL
   - Example: `http://localhost:3000/admin/invitation/accept?token=YOUR_TOKEN_HERE`

3. **Test the form flow:**
   - Step 1: Upload logo, enter org acronym and name
   - Step 2: Set password (must meet requirements)
   - Submit the form

### 3. Error Scenarios to Test

#### Network Errors
- Disconnect internet during logo upload
- Disconnect internet during form submission
- Expected: User-friendly error messages

#### Validation Errors
- Submit without logo
- Submit with weak password
- Submit with mismatched passwords
- Expected: Field-specific error messages

#### API Errors
- Use expired token
- Use invalid token
- Submit with existing org acronym
- Expected: Appropriate error messages

### 4. Logging Verification

Check browser console for proper logging:
- Info logs for successful operations
- Error logs for failures with context
- No more console.log statements

### 5. Environment Variables

Ensure these are set in `.env.local`:
```env
NEXT_PUBLIC_API_URL=http://localhost:8080
```

## Expected Behavior

### Success Flow
1. Token validation succeeds
2. Form loads with step indicator
3. Logo upload works
4. Password validation works
5. Form submission succeeds
6. Success message shows
7. Redirect to login page

### Error Handling
1. Network errors show user-friendly messages
2. Validation errors show field-specific messages
3. API errors show appropriate messages
4. All errors are logged with context

## Debugging

### Check Logs
- Browser console for frontend logs
- Backend console for server logs
- Check localStorage for stored error logs (if any)

### Common Issues
1. **CORS errors**: Check backend CORS configuration
2. **Token validation fails**: Check token format and expiration
3. **Logo upload fails**: Check file size and type restrictions
4. **Password validation**: Ensure all requirements are met

## Performance Notes
- Logo upload should show progress
- Form submission should show loading state
- Error messages should be clear and actionable
