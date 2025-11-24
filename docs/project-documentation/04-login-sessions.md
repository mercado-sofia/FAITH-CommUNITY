# Login Sessions

## Session Management by User Type

### 1. Public Users (Volunteers)

**Token Structure:**
- **Access Token**: JWT with 15-minute expiration
  - Payload: `{ id, email, role: 'user' }`
  - Stored in: `localStorage` (frontend)
  - Used in: `Authorization: Bearer <token>` header

- **Refresh Token**: Random 48-byte hex string
  - Expiration: 7 days
  - Stored in: httpOnly cookie (backend)
  - Not accessible to JavaScript (XSS protection)

**Session Flow:**
1. User logs in with email/password
2. Backend validates credentials
3. Backend issues:
   - Access token (JWT) → returned in response body
   - Refresh token → set as httpOnly cookie
4. Frontend stores access token in localStorage
5. Frontend includes access token in API requests
6. When access token expires:
   - Frontend detects expiration (60-second buffer)
   - Frontend calls `/api/users/refresh` with refresh token cookie
   - Backend validates refresh token
   - Backend rotates refresh token (revokes old, issues new)
   - Backend returns new access token
   - Frontend updates localStorage with new access token

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
  - Stored in: `localStorage` (frontend)
  - Used in: `Authorization: Bearer <token>` header

- **Refresh Token**: Random 48-byte hex string
  - Expiration: 7 days
  - Stored in: httpOnly cookie (backend)
  - Not accessible to JavaScript (XSS protection)

**Session Management:**
- **Database-Backed Sessions**: Sessions stored in `admin_sessions` table
- **Security Binding**: Sessions bound to IP address and User-Agent
- **Fingerprinting**: SHA-256 hash of IP + User-Agent
- **Token Hashing**: Tokens stored as SHA-256 hashes (not plain text)
- **Session Expiration**: Database session records expire in 30 minutes (separate from JWT token expiration)

**Session Flow:**
1. Admin logs in with email/password
2. Backend validates credentials
3. Backend creates session:
   - Generates JWT access token (15-minute expiration)
   - Issues refresh token (7-day expiration, stored in httpOnly cookie)
   - Creates fingerprint from IP + User-Agent
   - Stores session in `admin_sessions` table:
     - `token_hash`: SHA-256 hash of access token
     - `fingerprint`: SHA-256 hash of IP + User-Agent
     - `ip_address`: Client IP
     - `user_agent`: Client User-Agent
     - `expires_at`: 30 minutes from creation (database session record)
4. Frontend stores access token in localStorage
5. On each request:
   - Frontend sends token in Authorization header
   - Backend verifies token and session:
     - Validates JWT signature
     - Checks session exists and not expired
     - Verifies fingerprint matches current IP/UA
   - If fingerprint mismatch: Session revoked, request rejected
6. When access token expires:
   - Frontend can use refresh token to get new access token
   - Uses unified `/api/users/refresh` endpoint
   - Refresh token is rotated on each use

**Session Verification:**
- **IP/UA Mismatch**: Session automatically revoked
- **Expired Sessions**: Automatically cleaned up
- **Session Revocation**: Can revoke individual or all sessions
- **Token Refresh**: Admin users can refresh access tokens using refresh tokens

**Code Locations:**
- Backend: `backend/src/superadmin/controllers/adminController.js` - `loginAdmin()`
- Backend: `backend/src/utils/sessionSecurity.js` - Session management
- Backend: `backend/src/superadmin/middleware/verifyAdminToken.js` - Token verification
- Backend: `backend/src/(public)/controllers/userController.js` - `refreshAccessToken()` (unified for all roles)

### 3. Superadmin Users

**Token Structure:**
- **Access Token**: JWT with 15-minute expiration (uses unified `ACCESS_TOKEN_TTL`)
  - Payload: `{ id, email, role: 'superadmin' }`
  - Stored in: `localStorage` (frontend)
  - Used in: `Authorization: Bearer <token>` header

- **Refresh Token**: Random 48-byte hex string
  - Expiration: 7 days
  - Stored in: httpOnly cookie (backend)
  - Not accessible to JavaScript (XSS protection)

**Session Management:**
- Similar to admin sessions (database-backed with security binding)
- **2FA Support**: Optional TOTP-based two-factor authentication
- **Session Expiration**: Database session records expire in 30 minutes (separate from JWT token expiration)
- **Hardcoded Token**: Special "superadmin" token for main account (ID = 1)

**Session Flow:**
1. Superadmin logs in with email/password
2. If 2FA enabled: Requires TOTP code
3. Backend creates session:
   - Generates JWT access token (15-minute expiration)
   - Issues refresh token (7-day expiration, stored in httpOnly cookie)
   - Creates fingerprint from IP + User-Agent
   - Stores session in `admin_sessions` table (30-minute database record expiration)
4. Frontend stores access token in localStorage
5. Session verification (same as admin)
6. When access token expires:
   - Frontend can use refresh token to get new access token
   - Uses unified `/api/users/refresh` endpoint
   - Refresh token is rotated on each use

**Code Locations:**
- Backend: `backend/src/superadmin/controllers/superadminAuthController.js` - `loginSuperadmin()`
- Backend: `backend/src/utils/sessionSecurity.js` - Session management
- Backend: `backend/src/utils/twoFA.js` - 2FA implementation
- Backend: `backend/src/(public)/controllers/userController.js` - `refreshAccessToken()` (unified for all roles)

## Session Security Features

1. **Token Expiration**: Short-lived access tokens (15 minutes for all roles)
2. **Refresh Token Rotation**: Refresh tokens rotated on each use (all roles)
3. **Unified Refresh System**: All roles (user, admin, superadmin) use the same refresh token endpoint (`/api/users/refresh`)
4. **Session Binding**: IP address and User-Agent fingerprinting (admin/superadmin)
5. **Token Hashing**: Tokens stored as hashes in database (admin/superadmin)
6. **Automatic Cleanup**: Expired sessions automatically removed
7. **Revocation Support**: Ability to revoke sessions
8. **Security Violation Detection**: Sessions revoked on IP/UA mismatch (admin/superadmin)
9. **Database Session Records**: Admin/superadmin sessions stored in database with 30-minute expiration (separate from 15-minute JWT expiration)

## Session Storage

**Public Users:**
- Access Token: `localStorage.getItem('userToken')`
- Refresh Token: httpOnly cookie (not accessible to JavaScript)

**Admin Users:**
- Access Token: `localStorage.getItem('adminToken')`
- Session: Database (`admin_sessions` table)

**Superadmin Users:**
- Access Token: `localStorage.getItem('superAdminToken')`
- Session: Database (`admin_sessions` table, similar to admin)

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

