# Superadmin Setup Guide

## Problem
The superadmin authentication was failing with "Invalid credentials" due to two issues:
1. No superadmin account existed in the database
2. Missing database columns (`mfa_enabled`, `mfa_secret`, `password_changed_at`) in the superadmin table

## Solution
1. Created setup scripts to initialize the superadmin account
2. Fixed the superadmin table structure by adding missing columns

## Quick Setup (Development)

### Option 1: Quick Setup Script
```bash
cd backend
node scripts/utilities.js create-superadmin
```

This creates/updates a superadmin account with default credentials:
- **Email**: `faithcommunityfaces@gmail.com`
- **Password**: `admin123`

### Option 2: Check Superadmin Status
```bash
cd backend
node scripts/utilities.js check-superadmin
```

This will show you the current superadmin account details.

### Option 3: Reset Superadmin Password
```bash
cd backend
node scripts/utilities.js reset-superadmin-password
```

This will reset the superadmin password to the default `admin123`.

## Default Credentials
- **Email**: `faithcommunityfaces@gmail.com`
- **Password**: `admin123`
- **Login URL**: `http://localhost:3000/login` or `http://localhost:3000/superadmin/login`
- **Superadmin Panel**: `http://localhost:3000/superadmin`

**Important**: The superadmin account is automatically created when the database is first initialized. If you can't access it, run the `create-superadmin` command to ensure it exists and has the correct credentials.

## Security Recommendations

### After First Login:
1. **Change Password**: Update to a strong, unique password
2. **Enable MFA**: Set up Multi-Factor Authentication for additional security
3. **Use Strong Passwords**: Minimum 12 characters with mixed case, numbers, and symbols

### Production Setup:
1. Use the interactive setup script with strong credentials
2. Enable MFA immediately after account creation
3. Regularly rotate passwords
4. Monitor login attempts and suspicious activity

## Database Structure

The superadmin table includes:
- `id`: Primary key (fixed value: 1) - **Only one superadmin account is allowed**
- `username`: Email address (used for login)
- `password`: Bcrypt hashed password
- `twofa_enabled`: Multi-factor authentication status
- `twofa_secret`: TOTP secret for MFA
- `password_changed_at`: Last password change timestamp
- `created_at`: Account creation timestamp
- `updated_at`: Last update timestamp

### Single Superadmin Account Enforcement

**Important**: The database enforces a single superadmin account through multiple layers:

1. **Fixed ID Constraint**: The `id` column is fixed to `1` (not AUTO_INCREMENT)
2. **CHECK Constraint**: Database-level CHECK constraint ensures `id = 1` (MySQL 8.0.16+)
3. **Database Trigger**: Prevents multiple inserts (fallback for older MySQL versions)
4. **Application-Level Validation**: Creation script checks for existing accounts before creating

**Key Points**:
- Only **one** superadmin account can exist in the system
- The account cannot be deleted (it's a system requirement)
- Credentials (email/password) can be updated through the API endpoints
- The account is created during initial setup and persists throughout the system lifecycle

## Troubleshooting

### "Invalid credentials" Error:
1. **Check superadmin account**: Run `node scripts/utilities.js check-superadmin` to verify the account exists
2. **Verify email**: Make sure you're using `faithcommunityfaces@gmail.com` (not `superadmin@faith-community.com`)
3. **Reset password**: Run `node scripts/utilities.js reset-superadmin-password` to reset to default
4. **Create/update account**: Run `node scripts/utilities.js create-superadmin` to ensure account exists
5. Check database connection in `.env` file
6. Ensure MySQL server is running
7. Verify database credentials

### Database Connection Issues:
1. Check `.env` file configuration:
   ```
   MYSQL_HOST=localhost
   MYSQL_USER=root
   MYSQL_PASSWORD=your_password
   MYSQL_DATABASE=db_community
   ```
2. Ensure MySQL server is running
3. Verify database exists
4. Check user permissions

### Middleware Issues:
- The middleware correctly protects `/superadmin` routes
- Only users with `userRole=superadmin` cookie can access
- Login page is accessible to everyone

## Files Created/Modified

### Utility Commands:
- `node scripts/utilities.js create-superadmin` - Create/update superadmin account
- `node scripts/utilities.js check-superadmin` - Check superadmin account status
- `node scripts/utilities.js reset-superadmin-password` - Reset password to default

### Existing Files (No Changes Needed):
- `backend/src/superadmin/controllers/superadminAuthController.js` - Authentication logic
- `backend/src/superadmin/routes/superadminAuth.js` - API routes
- `frontend/src/middleware.js` - Route protection
- `frontend/src/app/(auth)/login/page.js` - Login form

## Testing

After running the setup script:

1. **Start the backend server**:
   ```bash
   cd backend
   npm start
   ```

2. **Start the frontend server**:
   ```bash
   cd frontend
   npm run dev
   ```

3. **Test login**:
   - Go to `http://localhost:3000/login` or `http://localhost:3000/superadmin/login`
   - Use credentials: `faithcommunityfaces@gmail.com` / `admin123`
   - Should redirect to `http://localhost:3000/superadmin`

## Support

If you encounter issues:
1. Check the console logs for error messages
2. Verify database connection and credentials
3. Ensure all required environment variables are set
4. Check that both frontend and backend servers are running
