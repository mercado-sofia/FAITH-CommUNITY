# JWT Authentication Troubleshooting Steps

## Current Issue
- Frontend shows "User token: Present" 
- Still getting 401 Unauthorized error
- JWT test script passes successfully

## Root Cause Analysis
The issue is likely that the user has an **old JWT token** that was generated with the old structure (`userId` instead of `id`).

## Solution Steps

### 1. **Restart Backend Server**
```bash
# Stop the current backend server (Ctrl+C)
# Then restart it
cd backend
npm start
```

### 2. **User Must Log Out and Log Back In**
The user needs to log out and log back in to get a new JWT token with the correct structure.

**Steps:**
1. Go to the user profile/logout page
2. Click "Logout" 
3. Clear browser localStorage (optional but recommended)
4. Log back in with the same credentials
5. Try submitting the volunteer application again

### 3. **Clear Browser Storage (Optional)**
If the above doesn't work, clear the browser's localStorage:

**In Browser Console:**
```javascript
localStorage.clear();
```

**Or manually:**
1. Open Developer Tools (F12)
2. Go to Application/Storage tab
3. Clear localStorage
4. Refresh the page and log in again

### 4. **Test Authentication Endpoint**
After logging back in, test the authentication:

```bash
# Test the auth endpoint (replace TOKEN with actual token)
curl -H "Authorization: Bearer TOKEN" http://localhost:8080/api/apply/test-auth
```

### 5. **Verify Token Structure**
Check the new token structure in browser console:

```javascript
// In browser console
const token = localStorage.getItem('userToken');
console.log('Token:', token);

// Decode the token (without verification)
const payload = JSON.parse(atob(token.split('.')[1]));
console.log('Token payload:', payload);
```

The payload should show:
```json
{
  "id": 123,
  "email": "user@example.com", 
  "role": "user"
}
```

**NOT:**
```json
{
  "userId": 123,  // ❌ Old structure
  "email": "user@example.com",
  "role": "user"
}
```

## Expected Results After Fix

1. ✅ Backend server restarted with new JWT structure
2. ✅ User logged out and logged back in
3. ✅ New token generated with `id` field (not `userId`)
4. ✅ Volunteer application submits successfully
5. ✅ No more 401 errors

## Debugging Information

### Frontend Console Should Show:
```
User token: Present
Token value: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Request data: {program_id: 42, reason: "..."}
```

### Backend Console Should Show:
```
Verifying token...
Authorization header: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Extracted token: Present
Decoded token: { id: 123, email: "...", role: "user" }
Extracted user_id: 123
Submit volunteer request received
Request body: { program_id: 42, reason: "..." }
Request user: { id: 123, email: "...", role: "user" }
```

## If Issues Persist

1. **Check JWT_SECRET**: Ensure environment variable is set correctly
2. **Verify Backend Logs**: Look for token verification errors
3. **Test Token Manually**: Use the test-auth endpoint
4. **Check Network Tab**: Verify the Authorization header is being sent

## Files Modified
- `backend/back_end/for_public/controllers/userController.js` - Fixed JWT token generation
- `backend/back_end/for_public/controllers/applyController.js` - Added debugging
- `frontend/src/app/(public)/apply/components/VolunteerForm.js` - Added token debugging
