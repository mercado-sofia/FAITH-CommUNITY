# What to Do When Backend Crashes

## Step 1: Check the Logs (Find the Error)

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

## Step 2: Identify the Problem

### Problem 1: Database Connection Failed

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

### Problem 2: Environment Validation Failed

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

### Problem 3: MySQL Service Not Running

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

### Problem 4: Wrong MySQL Credentials

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

## Step 3: Fix the Issue

Based on the error you found:

1. **Fix the variables** (if database/credentials issue)
2. **Start MySQL service** (if not running)
3. **Add missing variables** (if validation failed)

## Step 4: Redeploy/Restart

After fixing the issue:

### Option 1: Automatic Redeploy (Recommended)
- Railway will **automatically redeploy** when you change variables
- Wait for the new deployment to start
- Check the logs again

### Option 2: Manual Redeploy
1. Go to Railway → Backend Service → **Deployments** tab
2. Click **"Redeploy"** button (or three dots menu → Redeploy)
3. Wait for deployment to complete

### Option 3: Restart Service
1. Go to Railway → Backend Service → **Settings** tab
2. Scroll down to find **"Restart"** button
3. Click **"Restart"**
4. Wait for service to restart

## Step 5: Verify It's Fixed

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

## Quick Checklist

When backend crashes:

- [ ] **Check logs** - Find the exact error message
- [ ] **Identify problem** - Database, environment, or service issue?
- [ ] **Fix the issue** - Update variables, start MySQL, etc.
- [ ] **Redeploy** - Wait for automatic redeploy or trigger manually
- [ ] **Verify** - Check logs and test health endpoint
- [ ] **If still failing** - Check logs again for new errors

## Common Fixes Summary

| Error | Fix |
|-------|-----|
| `Database initialization failed` | Check MySQL service is running, verify MySQL variables |
| `Environment validation failed` | Add missing required environment variables |
| `ECONNREFUSED` | Start MySQL service, check `MYSQL_HOST` |
| `Access denied` | Update MySQL credentials in variables |
| `Unknown database` | Check `MYSQL_DATABASE` matches MySQL service |
| `SSL connection required` | Set `MYSQL_SSL=true` and `MYSQL_SSL_REJECT_UNAUTHORIZED=false` |

## Still Having Issues?

If you've tried everything and it's still crashing:

1. **Share the exact error message** from the logs
2. **Screenshot of Variables tab** (hide sensitive values)
3. **Check if MySQL service is running**
4. **Verify all required variables are set**

The logs will tell you exactly what's wrong - always check them first!

