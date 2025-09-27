# JWT Authentication Fix for Volunteer Applications

## Problem
The volunteer application submission was failing with a **401 Unauthorized** error due to a mismatch in JWT token payload structure.

## Root Cause
There was an inconsistency between how JWT tokens were generated and how they were being decoded:

1. **Token Generation** (in `loginUser`): Used `userId` as the key
2. **Token Verification** (in `verifyToken`): Expected `id` as the key  
3. **Token Usage** (in `submitVolunteer`): Tried to access `req.user.id`

## Fixes Applied

### 1. **Fixed JWT Token Generation**
**File**: `backend/src/(public)/controllers/userController.js`

**Before**:
```javascript
const token = jwt.sign(
  { userId: user.id, email: user.email, role: 'user' },
  process.env.JWT_SECRET || 'your-secret-key',
  { expiresIn: '7d' }
);
```

**After**:
```javascript
const token = jwt.sign(
  { id: user.id, email: user.email, role: 'user' },
  process.env.JWT_SECRET || 'your-secret-key',
  { expiresIn: '7d' }
);
```

### 2. **Fixed All User Controller Functions**
Updated all functions that access `req.user.userId` to use `req.user.id`:

- `getUserProfile`
- `updateUserProfile`
- `uploadProfilePhoto`
- `changePassword`
- `subscribeToNewsletter`
- `unsubscribeFromNewsletter`
- `getNewsletterStatus`
- `logoutUser`

### 3. **Fixed Volunteer Status Update Function**
**File**: `backend/src/(public)/controllers/applyController.js`

**Before**:
```javascript
LEFT JOIN users u ON v.email = u.email
WHERE v.id = ? AND v.db_status = 'Active'
```

**After**:
```javascript
LEFT JOIN users u ON v.user_id = u.id
WHERE v.id = ?
```

### 4. **Added Debugging**
Added console logs to help troubleshoot authentication issues:

- Frontend: Logs token presence and request data
- Backend: Logs token verification process and extracted user data

## Testing Steps

### 1. **Restart Backend Server**
```bash
# Stop and restart your backend server
```

### 2. **Test User Login**
1. Log in as a general user
2. Check browser console for token presence
3. Verify token is stored in localStorage

### 3. **Test Volunteer Application**
1. Navigate to Apply page
2. Select a program and enter reason
3. Submit application
4. Check browser console and backend logs

### 4. **Expected Results**
- ✅ No 401 errors
- ✅ Application submits successfully
- ✅ Success message displays
- ✅ Application appears in admin portal

## Debugging Information

### Frontend Console Logs
- `User token: Present` - Token is available
- `Request data: {program_id: X, reason: "..."}` - Request payload

### Backend Console Logs
- `Verifying token...` - Token verification started
- `Authorization header: Bearer <token>` - Token received
- `Decoded token: {id: X, email: "...", role: "user"}` - Token decoded
- `Extracted user_id: X` - User ID extracted

## Security Improvements

1. **Consistent Token Structure**: All JWT tokens now use `id` field
2. **Proper Authentication**: All protected routes require valid JWT tokens
3. **User ID Protection**: User ID is extracted from token, not request body
4. **Debugging Capability**: Added logs for troubleshooting

## Files Modified

### Backend Files
- `backend/src/(public)/controllers/userController.js`
- `backend/src/(public)/controllers/applyController.js`

### Frontend Files
- `frontend/src/app/(public)/apply/components/VolunteerForm.js`

## Next Steps

1. **Test the complete flow** after restarting the backend
2. **Remove debugging logs** once everything is working
3. **Verify admin portal** shows volunteer applications correctly
4. **Test status updates** from admin portal

## Rollback Plan

If issues persist:
1. Check JWT_SECRET environment variable
2. Verify user is properly logged in
3. Check browser localStorage for token
4. Review backend console logs for specific errors
