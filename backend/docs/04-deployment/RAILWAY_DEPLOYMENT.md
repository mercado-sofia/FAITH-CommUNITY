# Railway Deployment Guide

Complete guide for deploying the FAITH CommUNITY backend to Railway.

## Prerequisites

1. Railway account ([railway.app](https://railway.app))
2. GitHub repository connected to Railway
3. MySQL database (Railway provides MySQL service)

## Step 1: Create Railway Project

1. Go to [railway.app](https://railway.app)
2. Click "New Project"
3. Select "Deploy from GitHub repo"
4. Choose your repository

### ⚠️ IMPORTANT: Set Root Directory

After creating the project, you **MUST** configure the root directory:

**Option 1: In Railway Dashboard (Recommended)**
1. Click on your service
2. Go to **Settings** tab
3. Scroll to **Root Directory** section
4. Set Root Directory to: `backend`
5. Click **Save**
6. Railway will automatically redeploy

**Why this is important:** Railway needs to know where your `package.json` is located. Without setting the root directory, Railway will look in the repository root and won't find your Node.js project.

**Option 2: Using Railway CLI (Alternative)**
```bash
# Install Railway CLI
npm install -g @railway/cli

# Login
railway login

# Link to project
cd backend
railway link

# Set root directory
railway variables set RAILWAY_ROOT_DIRECTORY=backend
```

## Step 2: Add MySQL Database

1. In your Railway project, click "New"
2. Select "Database" → "MySQL"
3. Railway will automatically create a MySQL database
4. Note the connection details (you'll need these for environment variables)

## Step 3: Generate Security Secrets

Before setting environment variables, generate strong secrets:

```bash
# Generate JWT Secret
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"

# Generate CSRF Secret (run separately for a different value)
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

**Save these values securely** - you'll need them in the next step.

## Step 4: Configure Environment Variables

In Railway, go to your service → Variables tab and add the following:

### Required Environment Variables

```env
# Database (from Railway MySQL service)
MYSQL_HOST=${{MySQL.MYSQLHOST}}
MYSQL_PORT=${{MySQL.MYSQLPORT}}
MYSQL_USER=${{MySQL.MYSQLUSER}}
MYSQL_PASSWORD=${{MySQL.MYSQLPASSWORD}}
MYSQL_DATABASE=${{MySQL.MYSQLDATABASE}}

# SSL Configuration (Railway MySQL requires SSL)
MYSQL_SSL=true
MYSQL_SSL_REJECT_UNAUTHORIZED=false

# Security (CRITICAL - Use the secrets you generated)
JWT_SECRET=your-generated-jwt-secret-here
JWT_ISS=faith-community-api
JWT_AUD=faith-community-client
CSRF_SECRET=your-generated-csrf-secret-here

# Frontend URL (your frontend deployment URL)
FRONTEND_URL=https://your-frontend-domain.com

# Production Settings
NODE_ENV=production
PORT=8080
LOG_LEVEL=warn
ENABLE_HSTS=true

# CORS - Use your frontend URL
ALLOWED_ORIGINS=https://your-frontend-domain.com
```

### Recommended Environment Variables

```env
# SMTP Configuration (for email features)
# For SendGrid (Production - Recommended):
USE_SENDGRID_API=true
SENDGRID_API_KEY=SG.your-sendgrid-api-key-here
MAIL_FROM=FAITH CommUNITY <noreply@yourdomain.com>

# OR for Gmail:
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
MAIL_FROM=FAITH CommUNITY <your-email@gmail.com>

# Cloudinary (for file uploads)
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret

# AWS S3 (optional - for Post Act Reports)
AWS_REGION=ap-northeast-1
AWS_ACCESS_KEY_ID=your-key
AWS_SECRET_ACCESS_KEY=your-secret
AWS_S3_BUCKET_NAME=faith-community-files
```

### Important Notes

- **No quotes needed** in Railway Variables tab - just paste values directly
- **MySQL variables**: Use Railway references `${{MySQL.MYSQLHOST}}` or copy actual values from MySQL service
- **SendGrid**: Use port 587, NOT 465 (port 465 may be blocked)
- **Secrets**: Must be 32+ characters, different for JWT and CSRF

## Step 5: Deploy

1. Railway will automatically deploy when you push to your connected branch
2. Monitor the deployment logs in Railway dashboard
3. Check for any errors in the logs

## Step 6: Verify Deployment

### Test Health Endpoint

```bash
curl https://your-backend.railway.app/api/health
```

Expected response:
```json
{
  "success": true,
  "message": "API is running",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

### Check Railway Logs

1. Go to Railway → Your Service → **Deployments** tab
2. Click **"View logs"** on the active deployment
3. Verify:
   - ✅ Database connection successful
   - ✅ Environment validation passed
   - ✅ No errors in logs
   - ✅ Server started on port 8080

## Step 7: Post-Deployment

### Get Your Backend URL

1. Go to Railway → Your Backend Service → **Settings** tab
2. Scroll down to **"Public Domain"** or **"Generate Domain"**
3. Click **"Generate Domain"** to get a public URL
4. **Copy this URL** - you'll need it for the frontend

### Create Superadmin Account

After deployment, create the superadmin account:

**Option 1: Using Railway CLI**
```bash
railway run node scripts/utilities.js create-superadmin
```

**Option 2: Using API Endpoint**
```bash
curl -X POST https://your-backend.railway.app/api/superadmin/init \
  -H "Content-Type: application/json" \
  -d '{"secret": "your-initialization-secret"}'
```

### Update Frontend Environment Variables

In your frontend deployment (Vercel/Railway), update:
```env
NEXT_PUBLIC_API_URL=https://your-backend.railway.app
```

## Troubleshooting

### Database Connection Issues

**Error: "ECONNREFUSED" or "Connection refused"**
- Verify `MYSQL_HOST` and `MYSQL_PORT` are correct
- Check that MySQL service is running in Railway
- Ensure `MYSQL_SSL=true` is set

**Error: "Access denied"**
- Verify `MYSQL_USER` and `MYSQL_PASSWORD` are correct
- Check database user permissions
- Copy exact values from MySQL service variables

**Error: "SSL connection required"**
- Set `MYSQL_SSL=true` in environment variables
- Set `MYSQL_SSL_REJECT_UNAUTHORIZED=false` for Railway MySQL

### Environment Variable Issues

**Error: "Missing required environment variables"**
- Ensure all required variables are set in Railway
- Check variable names for typos (case-sensitive)
- Verify JWT_SECRET and CSRF_SECRET are set and strong (32+ chars)

**Error: "JWT_SECRET is using the default weak value"**
- Generate a strong secret using the command in Step 3
- Update `JWT_SECRET` in Railway variables

### SendGrid/Email Issues

**Error: "SMTP connection timeout"**
- For SendGrid: Use `SMTP_PORT=587` (NOT `465`)
- Verify `SMTP_USER=apikey` and `SMTP_PASS` is your SendGrid API key
- Consider using SendGrid API instead: `USE_SENDGRID_API=true`

**Error: "Email sending failed: Unauthorized"**
- Verify SendGrid API key is correct
- Check API key has proper permissions in SendGrid dashboard

### Build Issues

**Error: "Module not found"**
- Ensure `package.json` has all dependencies
- Check that `npm install` completes successfully in build logs
- Verify root directory is set to `backend`

**Error: "Railpack could not determine how to build the app"**
- Set Root Directory to `backend` in Railway Settings
- This is the most common issue - ensure this is done first!

### Application Crashes

**When backend crashes:**
1. Check Railway logs for error messages
2. Verify all environment variables are set
3. Check database connection in logs
4. Verify MySQL service is running
5. See [Troubleshooting Guide](./RAILWAY_TROUBLESHOOTING.md) for detailed solutions

## Security Checklist

Before going live, ensure:

- [ ] JWT_SECRET is set and strong (32+ characters, NOT default)
- [ ] CSRF_SECRET is set and strong (32+ characters, NOT default)
- [ ] Database credentials are secure
- [ ] SMTP credentials are secure
- [ ] CORS is configured with production frontend URL
- [ ] HSTS is enabled (`ENABLE_HSTS=true`)
- [ ] `NODE_ENV=production` is set
- [ ] `LOG_LEVEL=warn` is set (reduces log verbosity)
- [ ] All API keys and secrets are stored securely

## Monitoring

Check Railway dashboard for:
- Application logs
- Resource usage (CPU, Memory)
- Database metrics
- Deployment status

## Additional Resources

- [Railway Documentation](https://docs.railway.app)
- [Railway MySQL Guide](https://docs.railway.app/databases/mysql)
- [Troubleshooting Guide](./RAILWAY_TROUBLESHOOTING.md)
- [When Backend Crashes](./WHEN_BACKEND_CRASHES.md)
