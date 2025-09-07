# Superadmin Account Management

## Overview
This document provides comprehensive information about managing superadmin accounts in the FAITH-CommUNITY system, including setup, troubleshooting, and maintenance procedures.

## Database Structure

### Superadmin Table Schema
```sql
CREATE TABLE superadmin (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(255) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  mfa_enabled TINYINT(1) DEFAULT 0,
  mfa_secret VARCHAR(255) NULL,
  password_changed_at TIMESTAMP NULL DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

### Required Columns
- `id`: Primary key
- `username`: Email address used for login
- `password`: Bcrypt hashed password
- `mfa_enabled`: Multi-factor authentication status (0 = disabled, 1 = enabled)
- `mfa_secret`: TOTP secret for MFA (NULL if MFA disabled)
- `password_changed_at`: Last password change timestamp
- `created_at`: Account creation timestamp
- `updated_at`: Last update timestamp

## Authentication Flow

### Login Process
1. User submits email and password via `/api/superadmin/auth/login`
2. System queries `superadmin` table by username (email)
3. Validates password using bcrypt comparison
4. Checks MFA requirements if enabled
5. Generates JWT token on successful authentication
6. Returns token and user data

### API Endpoints
- **POST** `/api/superadmin/auth/login` - Superadmin login
- **POST** `/api/superadmin/auth/forgot-password` - Password reset
- **GET** `/api/superadmin/auth/profile/:id` - Get profile
- **PUT** `/api/superadmin/auth/password/:id` - Update password

## Common Issues and Solutions

### 1. "Invalid credentials" Error

#### Possible Causes:
- **Missing superadmin account**: No record exists in database
- **Missing database columns**: `mfa_enabled`, `mfa_secret`, `password_changed_at` columns don't exist
- **Incorrect password**: Password doesn't match stored hash
- **Database connection issues**: Backend can't connect to database

#### Solutions:

**Check if superadmin account exists:**
```sql
SELECT id, username, created_at FROM superadmin;
```

**Check table structure:**
```sql
DESCRIBE superadmin;
```

**Add missing columns if needed:**
```sql
ALTER TABLE superadmin ADD COLUMN mfa_enabled TINYINT(1) DEFAULT 0;
ALTER TABLE superadmin ADD COLUMN mfa_secret VARCHAR(255) NULL;
ALTER TABLE superadmin ADD COLUMN password_changed_at TIMESTAMP NULL DEFAULT NULL;
```

### 2. "Internal server error during login"

This usually indicates a database schema mismatch. The controller expects certain columns that don't exist in the table.

**Solution**: Run the column addition queries above.

### 3. Password Issues

**Reset superadmin password:**
```sql
-- Hash the new password using bcrypt (salt rounds: 10)
-- Example: password "newpassword123" becomes "$2b$10$..."
UPDATE superadmin 
SET password = '$2b$10$your_hashed_password_here', 
    password_changed_at = NOW(), 
    updated_at = NOW() 
WHERE username = 'superadmin@faith.com';
```

## Manual Account Creation

### Using SQL (Direct Database Access)

1. **Create superadmin account:**
```sql
INSERT INTO superadmin (username, password, created_at, updated_at) 
VALUES ('superadmin@faith.com', '$2b$10$hashed_password', NOW(), NOW());
```

2. **Hash password using Node.js:**
```javascript
const bcrypt = require('bcrypt');
const hashedPassword = await bcrypt.hash('your_password', 10);
console.log(hashedPassword);
```

### Using Database Management Tool

1. Open your database management tool (phpMyAdmin, MySQL Workbench, etc.)
2. Navigate to the `superadmin` table
3. Insert a new record with:
   - `username`: Email address
   - `password`: Bcrypt hashed password
   - `mfa_enabled`: 0 (disabled)
   - `mfa_secret`: NULL
   - `password_changed_at`: NULL

## Security Best Practices

### Password Requirements
- Minimum 8 characters
- Mix of uppercase, lowercase, numbers, and symbols
- Avoid common passwords
- Change default passwords immediately

### MFA Setup
1. Enable MFA in superadmin profile
2. Scan QR code with authenticator app
3. Verify with 6-digit code
4. Store backup codes securely

### Account Management
- Regularly rotate passwords
- Monitor login attempts
- Use strong, unique passwords
- Enable MFA for production accounts
- Keep backup superadmin accounts

## Troubleshooting Checklist

### Before Contacting Support:

1. **Verify database connection:**
   ```bash
   # Test database connectivity
   mysql -h localhost -u root -p db_community
   ```

2. **Check superadmin table exists:**
   ```sql
   SHOW TABLES LIKE 'superadmin';
   ```

3. **Verify table structure:**
   ```sql
   DESCRIBE superadmin;
   ```

4. **Check for superadmin records:**
   ```sql
   SELECT id, username, created_at FROM superadmin;
   ```

5. **Test API endpoint:**
   ```bash
   curl -X POST http://localhost:8080/api/superadmin/auth/login \
     -H "Content-Type: application/json" \
     -d '{"email":"superadmin@faith.com","password":"your_password"}'
   ```

6. **Check backend logs:**
   - Look for database connection errors
   - Check for missing column errors
   - Verify JWT secret configuration

## Environment Configuration

### Required Environment Variables
```env
MYSQL_HOST=localhost
MYSQL_USER=root
MYSQL_PASSWORD=your_password
MYSQL_DATABASE=db_community
JWT_SECRET=your_jwt_secret
JWT_ISS=faith-community
JWT_AUD=admin
```

### Backend Server
- Ensure backend server is running on port 8080
- Use `npm run dev` for development
- Check server logs for errors

## Support and Maintenance

### Regular Maintenance Tasks
- [ ] Verify superadmin account exists
- [ ] Check password expiration (if implemented)
- [ ] Review login logs for suspicious activity
- [ ] Update passwords periodically
- [ ] Test authentication flow

### Emergency Access
If superadmin access is completely lost:
1. Access database directly
2. Create new superadmin account
3. Update password for existing account
4. Verify authentication works
5. Update documentation

## Related Documentation
- [SUPERADMIN_SETUP.md](./SUPERADMIN_SETUP.md) - Initial setup guide
- [JWT_AUTHENTICATION_FIX.md](./JWT_AUTHENTICATION_FIX.md) - JWT configuration
- [TROUBLESHOOTING_STEPS.md](./TROUBLESHOOTING_STEPS.md) - General troubleshooting

## Contact Information
For additional support or questions about superadmin account management, refer to the development team or system administrator.
