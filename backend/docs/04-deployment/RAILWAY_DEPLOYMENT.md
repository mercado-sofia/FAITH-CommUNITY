# Railway Deployment Guide

This guide covers deploying the FAITH CommUNITY backend to Railway.

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

**Option 1: In Railway Dashboard (Recommended - DO THIS FIRST!)**
1. Click on your service
2. Go to **Settings** tab
3. Scroll to **Root Directory** section
4. Set Root Directory to: `backend`
5. Click **Save**
6. Railway will automatically redeploy

**Why this is important:** Railway needs to know where your `package.json` is located. Without setting the root directory, Railway will look in the repository root and won't find your Node.js project.

**Option 2: Using nixpacks.toml (Alternative - if Option 1 doesn't work)**
- A `nixpacks.toml` file has been created in the root directory
- This tells Nixpacks to install Node.js and run commands in the `backend` directory
- However, **Option 1 is still recommended** as it's cleaner

## Step 2: Add MySQL Database

1. In your Railway project, click "New"
2. Select "Database" → "MySQL"
3. Railway will automatically create a MySQL database
4. Note the connection details (you'll need these for environment variables)

## Step 3: Configure Environment Variables

In Railway, go to your service → Variables tab and add the following:

### Required Environment Variables

```env
# Database (from Railway MySQL service)
MYSQL_HOST=${{MySQL.MYSQLHOST}}
MYSQL_PORT=${{MySQL.MYSQLPORT}}
MYSQL_USER=${{MySQL.MYSQLUSER}}
MYSQL_PASSWORD=${{MySQL.MYSQLPASSWORD}}
MYSQL_DATABASE=${{MySQL.MYSQLDATABASE}}

# SSL Configuration (Railway MySQL uses SSL)
MYSQL_SSL=true
MYSQL_SSL_REJECT_UNAUTHORIZED=false

# Security (CRITICAL - Generate strong secrets)
JWT_SECRET=your-super-secure-jwt-secret-minimum-32-chars
JWT_ISS=faith-community-api
JWT_AUD=faith-community-client
CSRF_SECRET=your-super-secure-csrf-secret-minimum-32-chars

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

# Rate Limiting (Production Values)
RATE_LIMIT_GLOBAL_MAX=1000
RATE_LIMIT_AUTH_MAX=10
RATE_LIMIT_PUBLIC_MAX=2000
SLOWDOWN_GLOBAL_AFTER=200
SLOWDOWN_AUTH_AFTER=5
```

## Step 4: Railway-Specific Configuration

### Using Railway MySQL Variables

Railway provides MySQL connection details as environment variables. Use these references:

- `${{MySQL.MYSQLHOST}}` - Database host
- `${{MySQL.MYSQLPORT}}` - Database port (usually 3306)
- `${{MySQL.MYSQLUSER}}` - Database user
- `${{MySQL.MYSQLPASSWORD}}` - Database password
- `${{MySQL.MYSQLDATABASE}}` - Database name

### Build and Deploy Settings

Railway will automatically detect:
- **Build Command**: `npm install` (from `package.json`)
- **Start Command**: `node app.js` (from `package.json` scripts)

The `railway.json` and `Procfile` files are included for additional configuration if needed.

## Step 5: Deploy

1. Railway will automatically deploy when you push to your connected branch
2. Monitor the deployment logs in Railway dashboard
3. Check for any errors in the logs

## Step 6: Verify Deployment

1. Check health endpoint: `https://your-backend.railway.app/api/health`
2. Verify database connection in logs
3. Test API endpoints

## Step 7: Create Superadmin Account

After deployment, create the superadmin account:

1. SSH into your Railway service (or use Railway CLI)
2. Run: `node scripts/utilities.js create-superadmin`
3. Follow the prompts to create the superadmin account

Alternatively, you can use Railway's shell feature:
```bash
railway run node scripts/utilities.js create-superadmin
```

## Troubleshooting

### Database Connection Issues

- **Error**: "ECONNREFUSED" or "Connection refused"
  - **Solution**: Verify `MYSQL_HOST` and `MYSQL_PORT` are correct
  - Check that MySQL service is running in Railway

- **Error**: "Access denied"
  - **Solution**: Verify `MYSQL_USER` and `MYSQL_PASSWORD` are correct
  - Check database user permissions

- **Error**: "SSL connection required"
  - **Solution**: Set `MYSQL_SSL=true` in environment variables

### Environment Variable Issues

- **Error**: "Missing required environment variables"
  - **Solution**: Ensure all required variables are set in Railway
  - Check variable names for typos
  - Verify JWT_SECRET and CSRF_SECRET are set and strong (32+ chars)

### Port Issues

- Railway automatically sets `PORT` environment variable
- The app uses `process.env.PORT || 8080`, so it will work automatically
- No manual port configuration needed

### Build Issues

- **Error**: "Module not found"
  - **Solution**: Ensure `package.json` has all dependencies
  - Check that `npm install` completes successfully in build logs

## Security Checklist

- [ ] JWT_SECRET is set and strong (32+ characters)
- [ ] CSRF_SECRET is set and strong (32+ characters)
- [ ] Database credentials are secure
- [ ] SMTP credentials are secure
- [ ] CORS is configured with production frontend URL
- [ ] HSTS is enabled (`ENABLE_HSTS=true`)
- [ ] `NODE_ENV=production` is set
- [ ] `LOG_LEVEL=warn` is set (reduces log verbosity)

## Monitoring

- Check Railway dashboard for:
  - Application logs
  - Resource usage (CPU, Memory)
  - Database metrics
  - Deployment status

## Additional Resources

- [Railway Documentation](https://docs.railway.app)
- [Railway MySQL Guide](https://docs.railway.app/databases/mysql)
- Backend README: `../../README.md`
- Deployment Checklist: `DEPLOYMENT_CHECKLIST.md`
- Railway Environment Checklist: `RAILWAY_ENV_CHECKLIST.md`

