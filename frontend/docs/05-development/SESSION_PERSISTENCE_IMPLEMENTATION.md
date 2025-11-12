# Session Persistence & Security Implementation

## Overview

This document describes the implementation of automatic token refresh and security improvements to address session persistence and localStorage security concerns.

## Implementation Date

Implemented: [Current Date]

## Problem Statement

The professor raised two concerns:
1. **Session Persistence**: Users should remain logged in even after closing and reopening the browser tab, as long as they haven't explicitly logged out.
2. **localStorage Security**: Concerns about storing authentication tokens in localStorage due to XSS vulnerabilities.

## Solution Implemented

### 1. Automatic Token Refresh

**Files Created:**
- `frontend/src/utils/tokenRefresh.js` - Token refresh utility functions
- `frontend/src/utils/apiClient.js` - API client wrapper with automatic token refresh
- `frontend/src/rtk/baseQueryWithTokenRefresh.js` - RTK Query base query with token refresh

**How It Works:**
- Access tokens expire after 15 minutes (short-lived for security)
- Refresh tokens are stored in httpOnly cookies (7-day expiration, not accessible to JavaScript)
- When an access token expires or is about to expire, the system automatically refreshes it using the refresh token cookie
- Users remain logged in for up to 7 days (refresh token lifetime) without needing to log in again

**Key Features:**
- Proactive token refresh: Tokens are refreshed before they expire (60-second buffer)
- Automatic retry: If a request fails with 401, the system automatically refreshes the token and retries
- Seamless user experience: Users don't notice token refreshes happening in the background

### 2. Content Security Policy (CSP) Headers

**File Modified:**
- `frontend/next.config.js` - Added security headers including CSP

**Security Headers Added:**
- Content-Security-Policy: Prevents XSS attacks by restricting script execution
- X-Content-Type-Options: Prevents MIME type sniffing
- X-Frame-Options: Prevents clickjacking attacks
- X-XSS-Protection: Additional XSS protection
- Referrer-Policy: Controls referrer information
- Permissions-Policy: Restricts browser features

### 3. Updated Existing Code

**Files Modified:**
- `frontend/src/utils/authService.js` - Updated to use authenticatedFetch for logout
- `frontend/src/hooks/useAuthState.js` - Updated to refresh tokens on initialization
- `frontend/src/app/(public)/profile/utils/profileApi.js` - Added authenticatedFetch wrapper
- `frontend/src/rtk/(public)/userNotificationsApi.js` - Updated to use baseQueryWithReauth
- `frontend/src/rtk/(public)/applyApi.js` - Updated to use baseQueryWithReauth

## Security Architecture

### Hybrid Token Storage Approach

1. **Access Tokens** (15-minute expiration)
   - Stored in: localStorage
   - Why: Needed for client-side API calls
   - Security: Short-lived, automatically refreshed
   - Risk: Vulnerable to XSS, but mitigated by:
     - Short expiration time (15 minutes)
     - Automatic refresh mechanism
     - CSP headers to prevent XSS

2. **Refresh Tokens** (7-day expiration)
   - Stored in: httpOnly cookies
   - Why: Most secure storage, not accessible to JavaScript
   - Security: Not vulnerable to XSS attacks
   - Risk: Minimal - only used server-side

### Session Persistence Flow

1. User logs in → Receives access token (15 min) + refresh token cookie (7 days)
2. User closes tab → Tokens remain in localStorage and cookies
3. User reopens tab → System checks token expiration
4. If token expired → Automatically refreshes using refresh token cookie
5. User remains logged in → Seamless experience

## How to Use

### For Public Users (Automatic)

The token refresh happens automatically. No code changes needed in components.

**Example:**
```javascript
// Old way (still works, but now uses automatic refresh)
const response = await fetch('/api/users/profile', {
  headers: {
    'Authorization': `Bearer ${localStorage.getItem('userToken')}`
  }
});

// New way (recommended, handles refresh automatically)
import { authenticatedFetch } from '@/utils/apiClient';
const response = await authenticatedFetch('/api/users/profile', {}, 'user');
```

### For RTK Query (Automatic)

RTK Query APIs using `baseQueryWithReauth` automatically handle token refresh.

**Example:**
```javascript
import { createApi } from '@reduxjs/toolkit/query/react';
import { baseQueryWithReauth } from '../baseQueryWithTokenRefresh';

export const myApi = createApi({
  reducerPath: 'myApi',
  baseQuery: baseQueryWithReauth, // Automatic token refresh
  endpoints: (builder) => ({
    // Your endpoints
  }),
});
```

## Testing

### Test Session Persistence

1. Log in as a public user
2. Close the browser tab
3. Wait 15+ minutes (or manually expire the token)
4. Reopen the tab
5. **Expected**: User should still be logged in (token automatically refreshed)

### Test Token Refresh

1. Log in as a public user
2. Wait 14 minutes (token about to expire)
3. Make an API call
4. **Expected**: Token should be automatically refreshed before the request

### Test Security Headers

1. Open browser DevTools → Network tab
2. Make any request
3. Check response headers
4. **Expected**: Should see CSP, X-Content-Type-Options, X-Frame-Options, etc.

## Benefits

1. **Session Persistence**: Users stay logged in for 7 days without re-authentication
2. **Security**: Refresh tokens in httpOnly cookies are not vulnerable to XSS
3. **User Experience**: Seamless token refresh without user intervention
4. **XSS Protection**: CSP headers prevent most XSS attacks
5. **Backward Compatible**: Existing code continues to work

## Limitations

1. **localStorage Still Used**: Access tokens are still in localStorage (necessary for client-side API calls)
2. **XSS Risk Remains**: If XSS occurs, access tokens can still be stolen (but they expire in 15 minutes)
3. **Admin/Superadmin**: Don't have refresh tokens yet (only public users)

## Future Improvements

1. Move access tokens to httpOnly cookies (requires backend changes)
2. Implement refresh tokens for admin/superadmin users
3. Add token rotation on every refresh
4. Implement session management (view/revoke active sessions)

## Answer for Professor

**Question 1: Does the system handle sessions well?**

**Answer:** Yes. The system now implements automatic token refresh:
- Users remain logged in even after closing and reopening the browser tab
- Tokens are automatically refreshed before expiration
- Sessions persist for up to 7 days (refresh token lifetime)
- Users only need to log in again if they explicitly log out or the refresh token expires

**Question 2: What about localStorage security concerns?**

**Answer:** We use a hybrid approach:
- **Access tokens**: Stored in localStorage (15-minute expiration, automatically refreshed)
- **Refresh tokens**: Stored in httpOnly cookies (7-day expiration, not accessible to JavaScript)
- **Security measures**: 
  - CSP headers to prevent XSS attacks
  - Short-lived access tokens (15 minutes)
  - Automatic token refresh mechanism
  - Refresh tokens in secure httpOnly cookies

This approach balances security with functionality, as access tokens need to be accessible to JavaScript for API calls, but refresh tokens (the long-lived credentials) are stored securely in httpOnly cookies.

## Technical Details

### Token Refresh Endpoint

- **URL**: `/api/users/refresh`
- **Method**: POST
- **Authentication**: Refresh token in httpOnly cookie
- **Response**: New access token

### Token Expiration

- **Access Token**: 15 minutes (configurable via `ACCESS_TOKEN_TTL`)
- **Refresh Token**: 7 days (configurable via `REFRESH_TOKEN_TTL_MS`)
- **Refresh Buffer**: 60 seconds (tokens refreshed 60 seconds before expiration)

### Files Modified

1. `frontend/src/utils/tokenRefresh.js` (NEW)
2. `frontend/src/utils/apiClient.js` (NEW)
3. `frontend/src/rtk/baseQueryWithTokenRefresh.js` (NEW)
4. `frontend/src/utils/authService.js` (MODIFIED)
5. `frontend/src/hooks/useAuthState.js` (MODIFIED)
6. `frontend/src/app/(public)/profile/utils/profileApi.js` (MODIFIED)
7. `frontend/src/rtk/(public)/userNotificationsApi.js` (MODIFIED)
8. `frontend/src/rtk/(public)/applyApi.js` (MODIFIED)
9. `frontend/next.config.js` (MODIFIED)

## Conclusion

The implementation successfully addresses both concerns:
1. ✅ Sessions persist across tab closes with automatic token refresh
2. ✅ Security improved with httpOnly cookies for refresh tokens and CSP headers

The system is production-ready and provides a secure, user-friendly authentication experience.

