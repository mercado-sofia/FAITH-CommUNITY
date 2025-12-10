# Backend Setup Guide

Complete guide for setting up the FAITH CommUNITY backend for development and production.

## Quick Start

### Development Setup

1. **Install Dependencies**
   ```bash
   cd backend
   npm install
   ```

2. **Configure Environment Variables**
   Create a `.env` file in the `backend` directory (see Environment Variables section below)

3. **Start the Server**
   ```bash
   npm run dev
   ```

## Environment Variables

### Required for Development

Create a `.env` file in the `backend` directory:

```env
# Database Configuration (Local MySQL)
MYSQL_HOST=localhost
MYSQL_PORT=3306
MYSQL_USER=root
MYSQL_PASSWORD=your_local_password
MYSQL_DATABASE=db_community
MYSQL_SSL=false

# Security (Generate strong secrets - see below)
JWT_SECRET=your-jwt-secret-minimum-32-characters
JWT_ISS=faith-community-api
JWT_AUD=faith-community-client
CSRF_SECRET=your-csrf-secret-minimum-32-characters

# Frontend URL
FRONTEND_URL=http://localhost:3000

# Server Configuration
PORT=8080
NODE_ENV=development
LOG_LEVEL=debug
```

### Recommended for Development

```env
# SMTP Configuration (for email features)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
MAIL_FROM=FAITH CommUNITY <your-email@gmail.com>

# Cloudinary (for file uploads)
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret
```

### Generate Security Secrets

For development, you can generate secrets using:

```bash
# Generate JWT Secret
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"

# Generate CSRF Secret (run separately)
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

**Important**: Use different secrets for development and production!

## Superadmin Setup

### Initial Setup (Development)

The superadmin account is automatically created when the database is first initialized. If you need to create or reset it:

```bash
cd backend
node scripts/utilities.js create-superadmin
```

This creates/updates a superadmin account with default credentials:
- **Email**: `faithcommunityfaces@gmail.com`
- **Password**: `admin123`

### Check Superadmin Status

```bash
node scripts/utilities.js check-superadmin
```

### Reset Superadmin Password

```bash
node scripts/utilities.js reset-superadmin-password
```

### Default Credentials

- **Email**: `faithcommunityfaces@gmail.com`
- **Password**: `admin123`
- **Login URL**: `http://localhost:3000/login` or `http://localhost:3000/superadmin/login`

⚠️ **Important**: Change the password immediately after first login!

## Production Setup

### Superadmin Reset (Production)

If you can't access the superadmin account in production, use the initialization endpoint:

**Step 1: Set Secret Key**

Add to your production environment variables:
- `SUPERADMIN_INIT_SECRET` (preferred - set this specifically)
- OR use `JWT_SECRET` (fallback)

**Step 2: Call Initialization Endpoint**

```bash
curl -X POST https://your-production-domain.com/api/superadmin/auth/initialize \
  -H "Content-Type: application/json" \
  -d '{
    "secretKey": "your-secret-key-here"
  }'
```

**Step 3: Login with Default Credentials**

- **Email**: `faithcommunityfaces@gmail.com`
- **Password**: `admin123`

⚠️ **IMPORTANT**: Change the password immediately after first login!

### Production Environment Variables

For production (Railway, Render, etc.), see the [Deployment Guide](../04-deployment/RAILWAY_DEPLOYMENT.md) for complete environment variable configuration.

## SMTP Configuration

### Gmail Setup

1. Enable 2-factor authentication on your Gmail account
2. Generate an App Password:
   - Go to Google Account → Security → 2-Step Verification → App passwords
   - Generate a 16-character app password
3. Use the app password in `SMTP_PASS`

### SendGrid Setup (Production)

For production, SendGrid is recommended:

```env
USE_SENDGRID_API=true
SENDGRID_API_KEY=SG.your-sendgrid-api-key-here
MAIL_FROM=FAITH CommUNITY <noreply@yourdomain.com>
```

See [Railway SendGrid Setup](../04-deployment/RAILWAY_SENDGRID_SETUP.md) for detailed instructions.

## Database Setup

### Local MySQL

1. Install MySQL on your local machine
2. Create a database:
   ```sql
   CREATE DATABASE db_community;
   ```
3. The application will automatically create tables on first startup

### Database Schema

The system uses a **unified user authentication system**:

- **`users` table**: Core authentication table for all user roles (user, admin, superadmin)
  - Contains: `id`, `email`, `password_hash`, `role`, `is_active`, `email_verified`, `organization_id`, `twofa_enabled`, etc.
  - All user types (public users, admins, superadmin) are stored in this single table
  - Role is determined by the `role` enum column: `'user'`, `'admin'`, or `'superadmin'`

- **`user_profiles` table**: Extended profile data for public users only
  - Contains: `user_id`, `first_name`, `last_name`, `contact_number`, `gender`, `address`, `birth_date`, `profile_photo_url`, etc.
  - Linked to `users` table via `user_id` foreign key
  - Only public users (role = 'user') have entries in this table

**Benefits of Unified Structure:**
- ✅ Email uniqueness enforced at database level across all roles
- ✅ Simplified authentication queries
- ✅ Consistent password reset flow
- ✅ Reduced code duplication
- ✅ Better data integrity

### Production MySQL (Railway)

For production deployment, Railway provides MySQL service. See [Railway Deployment Guide](../04-deployment/RAILWAY_DEPLOYMENT.md) for setup instructions.

## File Storage Setup

### Cloudinary (Recommended)

1. Sign up at [cloudinary.com](https://cloudinary.com)
2. Get your credentials from the dashboard:
   - Cloud Name
   - API Key
   - API Secret
3. Add to `.env`:
   ```env
   CLOUDINARY_CLOUD_NAME=your-cloud-name
   CLOUDINARY_API_KEY=your-api-key
   CLOUDINARY_API_SECRET=your-api-secret
   ```

### AWS S3 (Optional - for Post Act Reports)

```env
AWS_REGION=ap-northeast-1
AWS_ACCESS_KEY_ID=your-key
AWS_SECRET_ACCESS_KEY=your-secret
AWS_S3_BUCKET_NAME=faith-community-files
```

### Pusher (Optional - for Real-time Notifications)

For real-time notifications via WebSocket:

```env
PUSHER_APP_ID=your-app-id
PUSHER_KEY=your-key
PUSHER_SECRET=your-secret
PUSHER_CLUSTER=us2
```

**Note:** If Pusher is not configured, the system will fall back to polling every 60 seconds for notifications. See [Pusher Documentation](../../docs/project-documentation/PUSHER.md) for detailed setup instructions.

## Testing the Setup

### 1. Test Database Connection

Start the server and check logs for:
- ✅ "Database connection successful"
- ✅ "Database initialized successfully"

### 2. Test Superadmin Login

1. Start backend: `npm run dev`
2. Start frontend: `cd ../frontend && npm run dev`
3. Navigate to `http://localhost:3000/login`
4. Use credentials: `faithcommunityfaces@gmail.com` / `admin123`
5. Should redirect to superadmin panel

### 3. Test Email (SMTP)

If SMTP is configured, test the forgot password feature:
1. Go to login page
2. Click "Forgot Password?"
3. Enter a valid email
4. Check email for reset link

## Troubleshooting

### Database Connection Failed

- Verify MySQL server is running
- Check database credentials in `.env`
- Ensure database exists: `CREATE DATABASE db_community;`
- Check MySQL user permissions

### Superadmin Login Fails

- Run `node scripts/utilities.js check-superadmin` to verify account exists
- Run `node scripts/utilities.js create-superadmin` to create/update account
- Verify email: `faithcommunityfaces@gmail.com` (not `superadmin@faith-community.com`)
- Check database connection

### SMTP/Email Issues

- Verify Gmail app password is correct (16 characters)
- Check SMTP credentials in `.env`
- For production, see [SendGrid Setup](../04-deployment/RAILWAY_SENDGRID_SETUP.md)

### Environment Variables Not Loading

- Ensure `.env` file is in `backend` directory
- Check for typos in variable names (case-sensitive)
- Verify no extra spaces around `=` sign
- Restart the server after changing `.env`

## Security Best Practices

1. **Never commit `.env` file** to version control (already in `.gitignore`)
2. **Use strong secrets** (32+ characters) for JWT_SECRET and CSRF_SECRET
3. **Use different secrets** for development and production
4. **Change default passwords** immediately after setup
5. **Enable MFA** for superadmin account in production
6. **Rotate secrets** periodically (every 6-12 months)

## Next Steps

- [Deployment Guide](../04-deployment/RAILWAY_DEPLOYMENT.md) - Deploy to production
- [Security Review](../02-security/SECURITY_REVIEW.md) - Security best practices
- [File Management](../03-file-management/CLOUDINARY_INTEGRATION_GUIDE.md) - File upload setup