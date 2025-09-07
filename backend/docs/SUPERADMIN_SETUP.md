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
node create-superadmin.js
```

This creates a superadmin account with default credentials:
- **Email**: `superadmin@faith-community.com`
- **Password**: `admin123`

### Option 2: Interactive Setup Script
```bash
cd backend
node setup-superadmin.js
```

This script will prompt you for:
- Email address
- Password (with confirmation)
- Option to update existing account

## Default Credentials
- **Email**: `superadmin@faith-community.com`
- **Password**: `admin123`
- **Login URL**: `http://localhost:3000/login`
- **Superadmin Panel**: `http://localhost:3000/superadmin`

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
- `id`: Primary key
- `username`: Email address (used for login)
- `password`: Bcrypt hashed password
- `mfa_enabled`: Multi-factor authentication status
- `mfa_secret`: TOTP secret for MFA
- `password_changed_at`: Last password change timestamp
- `created_at`: Account creation timestamp
- `updated_at`: Last update timestamp

## Troubleshooting

### "Invalid credentials" Error:
1. Verify superadmin account exists: Run `node create-superadmin.js`
2. Check database connection in `.env` file
3. Ensure MySQL server is running
4. Verify database credentials

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

### New Files:
- `backend/setup-superadmin.js` - Interactive setup script
- `backend/create-superadmin.js` - Quick setup script
- `backend/docs/SUPERADMIN_SETUP.md` - This documentation

### Existing Files (No Changes Needed):
- `backend/back_end/superadmin/controllers/superadminAuthController.js` - Authentication logic
- `backend/back_end/superadmin/routes/superadminAuth.js` - API routes
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
   - Go to `http://localhost:3000/login`
   - Use credentials: `superadmin@faith-community.com` / `admin123`
   - Should redirect to `http://localhost:3000/superadmin`

## Support

If you encounter issues:
1. Check the console logs for error messages
2. Verify database connection and credentials
3. Ensure all required environment variables are set
4. Check that both frontend and backend servers are running
