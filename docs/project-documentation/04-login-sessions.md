# Login Sessions

## Session Management by User Type

### 1. Public Users (Volunteers)

**Token Structure:**
- **Access Token**: JWT with 15-minute expiration
  - Payload: `{ id, email, role: 'user' }`
  - Stored in: httpOnly cookie (backend) - XSS protection
  - Automatically sent with requests via cookies
  - Also returned in response body for frontend storage if needed

- **Refresh Token**: Random 48-byte hex string
  - Expiration: 7 days
  - Stored in: httpOnly cookie (backend)
  - Not accessible to JavaScript (XSS protection)

**Session Flow:**
1. User logs in with email/password
2. Backend validates credentials
3. Backend issues:
   - Access token (JWT) → set as httpOnly cookie + returned in response body
   - Refresh token → set as httpOnly cookie
4. Frontend receives tokens via cookies (automatically sent with requests)
5. Backend middleware reads access token from cookies or Authorization header
6. When access token expires:
   - Frontend calls `/api/users/refresh` with refresh token cookie
   - Backend validates refresh token
   - Backend rotates refresh token (revokes old, issues new)
   - Backend sets new access token as httpOnly cookie
   - New access token automatically available for subsequent requests

**Token Refresh Mechanism:**
- **Proactive Refresh**: Tokens refreshed 60 seconds before expiration
- **Automatic Retry**: Failed requests (401) trigger automatic token refresh
- **Token Rotation**: Refresh tokens rotated on each use (security best practice)

**Code Locations:**
- Backend: `backend/src/(public)/controllers/userController.js` - `loginUser()`, `refreshAccessToken()`
- Backend: `backend/src/utils/jwt.js` - Token management functions
- Frontend: `frontend/src/utils/tokenRefresh.js` - Token refresh logic
- Frontend: `frontend/src/utils/apiClient.js` - API client with auto-refresh

### 2. Admin Users

**Token Structure:**
- **Access Token**: JWT with 15-minute expiration (uses unified `ACCESS_TOKEN_TTL`)
  - Payload: `{ id, email, role: 'admin', organization_id, org, orgName }`
  - Stored in: httpOnly cookie (backend) - XSS protection
  - Automatically sent with requests via cookies
  - Also returned in response body for frontend storage if needed

- **Refresh Token**: Random 48-byte hex string
  - Expiration: 7 days
  - Stored in: httpOnly cookie (backend)
  - Not accessible to JavaScript (XSS protection)

**Session Management:**
- **JWT-Based Authentication**: Uses JWT tokens for authentication (no database session storage)
- **Token Expiration**: Access tokens expire in 15 minutes
- **Refresh Tokens**: 7-day expiration, stored in httpOnly cookie

**Session Flow:**
1. Admin logs in with email/password
2. Backend validates credentials
3. Backend creates tokens:
   - Generates JWT access token (15-minute expiration)
   - Issues refresh token (7-day expiration, stored in httpOnly cookie)
4. Frontend stores access token in localStorage
5. On each request:
   - Frontend sends token in Authorization header or cookie
   - Backend verifies JWT token:
     - Validates JWT signature
     - Checks token expiration
     - Verifies admin account is active
     - Verifies organization is active (if applicable)
6. When access token expires:
   - Frontend can use refresh token to get new access token
   - Uses unified `/api/users/refresh` endpoint
   - Refresh token is rotated on each use

**Session Verification:**
- **JWT Validation**: Token signature and expiration checked
- **Account Status**: Admin account and organization status verified
- **Token Refresh**: Admin users can refresh access tokens using refresh tokens

**Code Locations:**
- Backend: `backend/src/superadmin/controllers/adminController.js` - `loginAdmin()`
- Backend: `backend/src/admin/controllers/adminAuthController.js` - `verifyAdminToken()` middleware
- Backend: `backend/src/(public)/controllers/userController.js` - `refreshAccessToken()` (unified for all roles)

### 3. Superadmin Users

**Token Structure:**
- **Access Token**: JWT with 15-minute expiration (uses unified `ACCESS_TOKEN_TTL`)
  - Payload: `{ id, email, role: 'superadmin' }`
  - Stored in: httpOnly cookie (backend) - XSS protection
  - Automatically sent with requests via cookies
  - Also returned in response body for frontend storage if needed

- **Refresh Token**: Random 48-byte hex string
  - Expiration: 7 days
  - Stored in: httpOnly cookie (backend)
  - Not accessible to JavaScript (XSS protection)

**Session Management:**
- **JWT-Based Authentication**: Uses JWT tokens for authentication (no database session storage)
- **2FA Support**: Optional TOTP-based two-factor authentication
- **Token Expiration**: Access tokens expire in 15 minutes
- **Hardcoded Token**: Special "superadmin" token for main account (ID = 1) - development only

**Session Flow:**
1. Superadmin logs in with email/password
2. If 2FA enabled: Requires TOTP code
3. Backend creates tokens:
   - Generates JWT access token (15-minute expiration)
   - Issues refresh token (7-day expiration, stored in httpOnly cookie)
4. Frontend stores access token in localStorage
5. Session verification (same as admin - JWT validation)
6. When access token expires:
   - Frontend can use refresh token to get new access token
   - Uses unified `/api/users/refresh` endpoint
   - Refresh token is rotated on each use

**Code Locations:**
- Backend: `backend/src/superadmin/controllers/superadminAuthController.js` - `loginSuperadmin()`
- Backend: `backend/src/utils/twoFA.js` - 2FA implementation
- Backend: `backend/src/(public)/controllers/userController.js` - `refreshAccessToken()` (unified for all roles)

## Session Security Features

1. **Token Expiration**: Short-lived access tokens (15 minutes for all roles)
2. **Refresh Token Rotation**: Refresh tokens rotated on each use (all roles)
3. **Unified Refresh System**: All roles (user, admin, superadmin) use the same refresh token endpoint (`/api/users/refresh`)
4. **JWT Validation**: Token signature and expiration verified on each request
5. **Account Status Checks**: Admin/superadmin account and organization status verified
6. **Revocation Support**: Refresh tokens can be revoked on logout
7. **Automatic Cleanup**: Expired refresh tokens automatically removed

## Session Storage

**Public Users:**
- Access Token: httpOnly cookie (automatically sent with requests, XSS protected)
- Refresh Token: httpOnly cookie (not accessible to JavaScript)

**Admin Users:**
- Access Token: httpOnly cookie (automatically sent with requests, XSS protected)
- Refresh Token: httpOnly cookie (not accessible to JavaScript)

**Superadmin Users:**
- Access Token: httpOnly cookie (automatically sent with requests, XSS protected)
- Refresh Token: httpOnly cookie (not accessible to JavaScript)

**Note:** Access tokens are stored in httpOnly cookies for enhanced security against XSS attacks. CSRF protection is provided via the double-submit cookie pattern. The backend middleware supports both cookie-based and Authorization header-based token reading for flexibility.

## Logout Process

**Public Users:**
1. Frontend calls `/api/users/logout`
2. Backend revokes refresh token
3. Frontend clears localStorage
4. Cookie automatically expires

**Admin/Superadmin:**
1. Frontend calls logout endpoint
2. Backend revokes session from database
3. Frontend clears localStorage

---

**Back to [Main Documentation](../PROJECT_DOCUMENTATION.md)**

