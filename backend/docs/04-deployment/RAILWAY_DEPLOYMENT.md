# Railway Deployment Guide

Complete guide for deploying the FAITH CommUNITY backend to Railway, including setup, configuration, troubleshooting, and email service setup.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Initial Setup](#initial-setup)
3. [Environment Variables](#environment-variables)
4. [SendGrid Email Configuration](#sendgrid-email-configuration)
5. [Deployment & Verification](#deployment--verification)
6. [Troubleshooting](#troubleshooting)
7. [When Backend Crashes](#when-backend-crashes)
8. [Security Checklist](#security-checklist)

---

## Prerequisites

1. Railway account ([railway.app](https://railway.app))
2. GitHub repository connected to Railway
3. MySQL database (Railway provides MySQL service)
4. SendGrid account (for email features - optional but recommended)

---

## Initial Setup

### Step 1: Create Railway Project

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

### Step 2: Add MySQL Database

1. In your Railway project, click "New"
2. Select "Database" → "MySQL"
3. Railway will automatically create a MySQL database
4. Note the connection details (you'll need these for environment variables)

### Step 3: Generate Security Secrets

Before setting environment variables, generate strong secrets:

```bash
# Generate JWT Secret
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"

# Generate CSRF Secret (run separately for a different value)
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

**Save these values securely** - you'll need them in the next step.

---

## Environment Variables

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
- **Secrets**: Must be 32+ characters, different for JWT and CSRF

---

## SendGrid Email Configuration

### Quick Setup Checklist

For Railway deployment, ensure these environment variables are set:

```env
# CRITICAL: Enable SendGrid API (not SMTP)
USE_SENDGRID_API=true

# CRITICAL: Your SendGrid API key (starts with SG.)
SMTP_PASS=SG.your-actual-sendgrid-api-key-here
# OR use this instead:
# SENDGRID_API_KEY=SG.your-actual-sendgrid-api-key-here

# CRITICAL: From email address (must be verified in SendGrid)
MAIL_FROM="FAITH CommUNITY" <faithcommunityfaces@gmail.com>

# Optional: These are not used when USE_SENDGRID_API=true, but you can keep them
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
```

### Step-by-Step SendGrid Setup

#### Step 1: Verify SendGrid API Key

1. Log in to [SendGrid Dashboard](https://app.sendgrid.com)
2. Go to **Settings** → **API Keys**
3. Create a new API key with **Full Access** or **Mail Send** permissions
4. Copy the API key (it starts with `SG.`)
5. **Important:** You can only see the key once - copy it immediately!

#### Step 2: Verify Sender Email in SendGrid

1. In SendGrid Dashboard, go to **Settings** → **Sender Authentication**
2. Click **Single Sender Verification**
3. Add `faithcommunityfaces@gmail.com`
4. Verify the email address (check your inbox for verification email)

#### Step 3: Set Environment Variables in Railway

1. Go to [Railway Dashboard](https://railway.app)
2. Select your project
3. Click on your backend service
4. Go to **Variables** tab
5. Add/update these variables:
   - `USE_SENDGRID_API` = `true`
   - `SMTP_PASS` = `SG.your-actual-sendgrid-api-key-here`
   - `MAIL_FROM` = `"FAITH CommUNITY" <faithcommunityfaces@gmail.com>`

#### Step 4: Verify Configuration

Check your Railway logs after deployment. You should see:

```
✅ SendGrid API configured - email features are ready
   → Using SendGrid SDK (HTTPS) instead of SMTP
```

### SendGrid Common Issues

#### Issue 1: "SendGrid API not configured"

**Problem:** `SMTP_PASS` or `SENDGRID_API_KEY` is not set or empty.

**Solution:**
1. Go to Railway → Variables
2. Check that `SMTP_PASS` or `SENDGRID_API_KEY` is set
3. Make sure the value starts with `SG.`
4. Remove any extra spaces or quotes
5. Redeploy

#### Issue 2: "USE_SENDGRID_API is not 'true'"

**Problem:** The environment variable is not set to exactly `true` (case-sensitive).

**Solution:**
1. Go to Railway → Variables
2. Set `USE_SENDGRID_API` to exactly `true` (lowercase, no quotes)
3. Do NOT use: `"true"`, `TRUE`, `True`, or `'true'`
4. Redeploy

#### Issue 3: Connection Timeout Errors

**Problem:** Connection timeout when using SMTP (port 465 or 587 blocked).

**Solution:** Use SendGrid REST API instead (recommended):

```env
# Enable SendGrid SDK (uses HTTPS instead of SMTP)
USE_SENDGRID_API=true
SMTP_PASS=SG.your-sendgrid-api-key-here
MAIL_FROM="FAITH CommUNITY" <faithcommunityfaces@gmail.com>
```

**Benefits of SendGrid SDK:**
- ✅ Uses HTTPS (port 443) - almost never blocked
- ✅ Official SendGrid package - well-maintained and tested
- ✅ More reliable in deployment environments
- ✅ Better error messages
- ✅ Faster than SMTP

#### Issue 4: "Email sending failed: Unauthorized"

**Problem:** SendGrid API key is invalid or doesn't have correct permissions.

**Solution:**
1. Verify your API key in SendGrid Dashboard
2. Make sure the API key has **Mail Send** or **Full Access** permissions
3. Create a new API key if needed
4. Update `SMTP_PASS` in Railway with the new key
5. Redeploy

#### Issue 5: "Email sending failed: Forbidden"

**Problem:** The sender email (`faithcommunityfaces@gmail.com`) is not verified in SendGrid.

**Solution:**
1. Go to SendGrid Dashboard → Settings → Sender Authentication
2. Click **Single Sender Verification**
3. Add and verify `faithcommunityfaces@gmail.com`
4. Check your email inbox for verification email
5. Click the verification link

### Environment Variable Summary

| Variable | Required | Value | Notes |
|----------|----------|-------|-------|
| `USE_SENDGRID_API` | ✅ Yes | `true` | Must be exactly `true` (lowercase) |
| `SMTP_PASS` | ✅ Yes* | `SG.xxxxx` | Your SendGrid API key |
| `SENDGRID_API_KEY` | ✅ Yes* | `SG.xxxxx` | Alternative to SMTP_PASS |
| `MAIL_FROM` | ✅ Yes | `"FAITH CommUNITY" <faithcommunityfaces@gmail.com>` | Must be verified in SendGrid |
| `SMTP_HOST` | ❌ No | `smtp.sendgrid.net` | Not used when USE_SENDGRID_API=true |
| `SMTP_PORT` | ❌ No | `587` | Not used when USE_SENDGRID_API=true |
| `SMTP_USER` | ❌ No | `apikey` | Not used when USE_SENDGRID_API=true |

*You need either `SMTP_PASS` OR `SENDGRID_API_KEY`, not both.

---

## Deployment & Verification

### Step 1: Deploy

1. Railway will automatically deploy when you push to your connected branch
2. Monitor the deployment logs in Railway dashboard
3. Check for any errors in the logs

### Step 2: Verify Deployment

#### Test Health Endpoint

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

#### Check Railway Logs

1. Go to Railway → Your Service → **Deployments** tab
2. Click **"View logs"** on the active deployment
3. Verify:
   - ✅ Database connection successful
   - ✅ Environment validation passed
   - ✅ No errors in logs
   - ✅ Server started on port 8080

### Step 3: Post-Deployment

#### Get Your Backend URL

1. Go to Railway → Your Backend Service → **Settings** tab
2. Scroll down to **"Public Domain"** or **"Generate Domain"**
3. Click **"Generate Domain"** to get a public URL
4. **Copy this URL** - you'll need it for the frontend

#### Create Superadmin Account

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

#### Update Frontend Environment Variables

In your frontend deployment (Vercel/Railway), update:
```env
NEXT_PUBLIC_API_URL=https://your-backend.railway.app
```

---

## Troubleshooting

### Common Build Issues

#### Issue: "Railpack could not determine how to build the app"

**Error Message:**
```
⚠ Script start.sh not found
✖ Railpack could not determine how to build the app.
```

**Cause:** Railway is analyzing the root directory instead of the `backend/` directory.

**Solution:**
1. Go to your Railway project
2. Click on your backend service
3. Go to **Settings** tab
4. Scroll down to **Root Directory** section
5. Enter: `backend` (without quotes)
6. Click **Save**
7. Railway will automatically redeploy

**This is the most important step!** Without setting the root directory, Railway won't find your `package.json`.

#### Issue: "Module not found" or "Cannot find module"

**Cause:** Dependencies not installed or wrong Node.js version.

**Solution:**
1. Check that `package.json` exists in the `backend/` directory
2. Verify Railway is using Node.js 18+ (check in Settings → Build)
3. Check build logs to see if `npm install` completed successfully
4. Ensure all dependencies are listed in `package.json`

### Database Connection Issues

#### Error: "ECONNREFUSED" or "Connection refused"

**Solution:**
- Verify `MYSQL_HOST` and `MYSQL_PORT` are correct
- Check that MySQL service is running in Railway
- Ensure `MYSQL_SSL=true` is set

#### Error: "Access denied"

**Solution:**
- Verify `MYSQL_USER` and `MYSQL_PASSWORD` are correct
- Check database user permissions
- Copy exact values from MySQL service variables
- Or use Railway variable references: `${{MySQL.MYSQLUSER}}`

#### Error: "SSL connection required"

**Solution:**
- Set `MYSQL_SSL=true` in environment variables
- Set `MYSQL_SSL_REJECT_UNAUTHORIZED=false` for Railway MySQL

### Environment Variable Issues

#### Error: "Missing required environment variables"

**Solution:**
- Ensure all required variables are set in Railway
- Check variable names for typos (case-sensitive)
- Verify JWT_SECRET and CSRF_SECRET are set and strong (32+ chars)

#### Error: "JWT_SECRET is using the default weak value"

**Solution:**
- Generate a strong secret using the command in Step 3
- Update `JWT_SECRET` in Railway variables

### Application Crashes

**When backend crashes:**
1. Check Railway logs for error messages
2. Verify all environment variables are set
3. Check database connection in logs
4. Verify MySQL service is running
5. See [When Backend Crashes](#when-backend-crashes) section below

---

## When Backend Crashes

### Step 1: Check the Logs (Find the Error)

1. Go to Railway Dashboard
2. Click on your **Backend Service** (FAITH-CommUNITY)
3. Click on **"Deployments"** tab
4. Find your **latest deployment** (the one that failed)
5. Click **"View logs"** button
6. **Scroll to the bottom** - the error is usually at the end
7. Look for red error messages or lines starting with `❌`

**Common error messages:**
- `❌ Database initialization failed`
- `❌ Environment validation failed`
- `Error: connect ECONNREFUSED`
- `Error: Access denied`
- `Process exited with code 1`

### Step 2: Identify the Problem

#### Problem 1: Database Connection Failed

**Error looks like:**
```
❌ Database initialization failed: Error: connect ECONNREFUSED
```

**What to do:**
1. Check if **MySQL service is running** in Railway
2. Go to Railway → **MySQL Service** → Check status
3. If not running, **start it**
4. Verify MySQL variables in Backend Service → Variables:
   - `MYSQL_HOST` = `mysql.railway.internal` or `${{MySQL.MYSQLHOST}}`
   - `MYSQL_PORT` = `3306` or `${{MySQL.MYSQLPORT}}`
   - `MYSQL_USER` = `root` or `${{MySQL.MYSQLUSER}}`
   - `MYSQL_PASSWORD` = (from MySQL service) or `${{MySQL.MYSQLPASSWORD}}`
   - `MYSQL_DATABASE` = (from MySQL service) or `${{MySQL.MYSQLDATABASE}}`
   - `MYSQL_SSL` = `true`
   - `MYSQL_SSL_REJECT_UNAUTHORIZED` = `false`

#### Problem 2: Environment Validation Failed

**Error looks like:**
```
❌ Environment validation failed: Missing required environment variable: JWT_SECRET
```

**What to do:**
1. Go to Railway → Backend Service → **Variables** tab
2. Check that all **required** variables are set:
   - `JWT_SECRET`
   - `JWT_ISS`
   - `JWT_AUD`
   - `CSRF_SECRET`
   - `NODE_ENV` = `production`
   - All MySQL variables (see Problem 1)
3. Add any missing variables

#### Problem 3: MySQL Service Not Running

**Error looks like:**
```
Error: connect ECONNREFUSED mysql.railway.internal:3306
```

**What to do:**
1. Go to Railway → **MySQL Service**
2. Check if it's **running**
3. If not, click **"Start"** or **"Restart"**
4. Wait for it to fully start (check MySQL logs)
5. Then redeploy your backend

#### Problem 4: Wrong MySQL Credentials

**Error looks like:**
```
Error: Access denied for user 'root'@'...'
```

**What to do:**
1. Go to Railway → **MySQL Service** → **Variables** tab
2. Copy the exact values for:
   - `MYSQLUSER`
   - `MYSQLPASSWORD`
   - `MYSQLDATABASE`
3. Go to Backend Service → **Variables** tab
4. Update:
   - `MYSQL_USER` = (copy from MySQL)
   - `MYSQL_PASSWORD` = (copy from MySQL)
   - `MYSQL_DATABASE` = (copy from MySQL)
5. **OR** use Railway variable references:
   - `MYSQL_USER=${{MySQL.MYSQLUSER}}`
   - `MYSQL_PASSWORD=${{MySQL.MYSQLPASSWORD}}`
   - `MYSQL_DATABASE=${{MySQL.MYSQLDATABASE}}`

### Step 3: Fix the Issue

Based on the error you found:

1. **Fix the variables** (if database/credentials issue)
2. **Start MySQL service** (if not running)
3. **Add missing variables** (if validation failed)

### Step 4: Redeploy/Restart

After fixing the issue:

#### Option 1: Automatic Redeploy (Recommended)
- Railway will **automatically redeploy** when you change variables
- Wait for the new deployment to start
- Check the logs again

#### Option 2: Manual Redeploy
1. Go to Railway → Backend Service → **Deployments** tab
2. Click **"Redeploy"** button (or three dots menu → Redeploy)
3. Wait for deployment to complete

#### Option 3: Restart Service
1. Go to Railway → Backend Service → **Settings** tab
2. Scroll down to find **"Restart"** button
3. Click **"Restart"**
4. Wait for service to restart

### Step 5: Verify It's Fixed

1. **Check the logs again:**
   - Go to Deployments → View logs
   - Look for: `✅ Database initialized successfully`
   - Look for: `✅ Environment validation passed`
   - No red error messages

2. **Test the health endpoint:**
   - Open: `https://your-backend.railway.app/api/health`
   - Should see:
     ```json
     {
       "success": true,
       "message": "API is running",
       "timestamp": "..."
     }
     ```

3. **If still failing:**
   - Check logs again for new errors
   - Verify all variables are set correctly
   - Make sure MySQL service is running

### Quick Checklist

When backend crashes:

- [ ] **Check logs** - Find the exact error message
- [ ] **Identify problem** - Database, environment, or service issue?
- [ ] **Fix the issue** - Update variables, start MySQL, etc.
- [ ] **Redeploy** - Wait for automatic redeploy or trigger manually
- [ ] **Verify** - Check logs and test health endpoint
- [ ] **If still failing** - Check logs again for new errors

### Common Fixes Summary

| Error | Fix |
|-------|-----|
| `Database initialization failed` | Check MySQL service is running, verify MySQL variables |
| `Environment validation failed` | Add missing required environment variables |
| `ECONNREFUSED` | Start MySQL service, check `MYSQL_HOST` |
| `Access denied` | Update MySQL credentials in variables |
| `Unknown database` | Check `MYSQL_DATABASE` matches MySQL service |
| `SSL connection required` | Set `MYSQL_SSL=true` and `MYSQL_SSL_REJECT_UNAUTHORIZED=false` |

---

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

---

## Monitoring

Check Railway dashboard for:
- Application logs
- Resource usage (CPU, Memory)
- Database metrics
- Deployment status

---

## Additional Resources

- [Railway Documentation](https://docs.railway.app)
- [Railway MySQL Guide](https://docs.railway.app/databases/mysql)
- [General Deployment Guide](./DEPLOYMENT_GUIDE.md) - For other platforms
