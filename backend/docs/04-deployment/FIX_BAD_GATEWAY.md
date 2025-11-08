# Fix "Bad Gateway" Error

## What "Bad Gateway" Means

"Bad Gateway" (502 error) means Railway successfully connected to your domain, but your backend application isn't responding. This usually means:

1. **Your app crashed during startup**
2. **Database connection failed**
3. **Environment validation failed**
4. **App isn't listening on the correct port**
5. **App is still starting up**

## How to Fix: Check Railway Logs

### Step 1: Go to Railway Logs

1. Go to Railway Dashboard
2. Click on your **backend service** (FAITH-CommUNITY)
3. Click on **"Deployments"** tab
4. Find your **latest deployment** (the one that says "ACTIVE")
5. Click **"View logs"** button

### Step 2: Look for These Errors

Scroll through the logs and look for:

#### ✅ Good Signs (App is Running):
- `✅ Database initialized successfully`
- `Server running at http://localhost:8080` (or similar)
- `✅ Environment validation passed`
- No error messages

#### ❌ Bad Signs (App Crashed):
- `❌ Database initialization failed`
- `❌ Environment validation failed`
- `Error: Cannot connect to MySQL`
- `Error: Missing required environment variable`
- `Process exited with code 1`
- Any red error messages

### Step 3: Common Issues and Fixes

#### Issue 1: Database Connection Failed

**Error in logs:**
```
❌ Database initialization failed: Error: connect ECONNREFUSED
```

**Fix:**
1. Go to Railway → **Variables** tab
2. Verify MySQL variables are set:
   - `MYSQL_HOST` = `mysql.railway.internal` (or your MySQL service name)
   - `MYSQL_PORT` = `3306`
   - `MYSQL_USER` = `root`
   - `MYSQL_PASSWORD` = (from your MySQL service)
   - `MYSQL_DATABASE` = `railway` (or your database name)
   - `MYSQL_SSL` = `true`
   - `MYSQL_SSL_REJECT_UNAUTHORIZED` = `false`
3. Make sure your **MySQL service is running** in Railway

#### Issue 2: Environment Validation Failed

**Error in logs:**
```
❌ Environment validation failed: Missing required environment variable: JWT_SECRET
```

**Fix:**
1. Go to Railway → **Variables** tab
2. Check that all **required** variables are set:
   - `JWT_SECRET`
   - `JWT_ISS`
   - `JWT_AUD`
   - `CSRF_SECRET`
   - `MYSQL_HOST`
   - `MYSQL_USER`
   - `MYSQL_PASSWORD`
   - `MYSQL_DATABASE`
   - `NODE_ENV` = `production`
3. Add any missing variables

#### Issue 3: Port Mismatch

**Error in logs:**
```
Error: listen EADDRINUSE: address already in use :::8080
```

**Fix:**
1. Railway automatically sets `PORT` environment variable
2. Your app uses `process.env.PORT || 8080` which is correct
3. If you see this error, it's usually a Railway issue - try redeploying

#### Issue 4: App Still Starting

**In logs:**
- No errors, but app seems to be hanging

**Fix:**
1. Wait a few minutes - Railway might still be starting
2. Check if database connection is taking too long
3. Try redeploying

## Quick Checklist

Before checking logs, verify:

- [ ] MySQL service is **running** in Railway
- [ ] All **required environment variables** are set
- [ ] `MYSQL_SSL=true` and `MYSQL_SSL_REJECT_UNAUTHORIZED=false` are set
- [ ] `NODE_ENV=production` is set
- [ ] No typos in environment variable names

## What to Share

If you need help, share:
1. **The error message** from the logs (the red text)
2. **The last 20-30 lines** of the logs
3. **Screenshot** of your Variables tab (hide sensitive values)

## After Fixing

Once you fix the issue:

1. Railway will **automatically redeploy** (or trigger a redeploy)
2. Wait for deployment to complete
3. Try accessing your URL again: `https://faith-community-production.up.railway.app/api/health`
4. You should see:
   ```json
   {
     "success": true,
     "message": "API is running",
     "timestamp": "..."
   }
   ```

