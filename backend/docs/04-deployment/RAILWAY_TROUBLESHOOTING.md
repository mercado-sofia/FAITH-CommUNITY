# Railway Deployment Troubleshooting

## Common Issues and Solutions

### Issue: "Railpack could not determine how to build the app"

**Error Message:**
```
⚠ Script start.sh not found
✖ Railpack could not determine how to build the app.
The app contents that Railpack analyzed contains:
./
├── backend/
├── frontend/
└── .gitignore
```

**Cause:** Railway is analyzing the root directory instead of the `backend/` directory.

**Solution:**

#### Option 1: Set Root Directory in Railway Dashboard (MUST DO THIS!)

1. Go to your Railway project
2. Click on your backend service
3. Go to **Settings** tab
4. Scroll down to **Root Directory** section
5. Enter: `backend` (without quotes, just the word backend)
6. Click **Save**
7. Railway will automatically redeploy

**This is the most important step!** Without setting the root directory, Railway won't find your `package.json` and Node.js won't be installed.

#### Option 2: Use nixpacks.toml (Alternative)

A `nixpacks.toml` file has been created in the root directory that tells Nixpacks where to find Node.js. However, **Option 1 is still required** for the best results.

#### Option 3: Create a Separate Repository

If the above options don't work, you can:
1. Create a separate repository with only the backend code
2. Deploy that repository to Railway
3. This ensures Railway only sees the backend directory

---

### Issue: "Module not found" or "Cannot find module"

**Cause:** Dependencies not installed or wrong Node.js version.

**Solution:**
1. Check that `package.json` exists in the `backend/` directory
2. Verify Railway is using Node.js 18+ (check in Settings → Build)
3. Check build logs to see if `npm install` completed successfully
4. Ensure all dependencies are listed in `package.json`

---

### Issue: "Database connection failed"

**Error:** `ECONNREFUSED` or `Access denied`

**Solution:**
1. Verify MySQL service is running in Railway
2. Check environment variables:
   - `MYSQL_HOST` should use `${{MySQL.MYSQLHOST}}`
   - `MYSQL_PASSWORD` should use `${{MySQL.MYSQLPASSWORD}}`
   - All MySQL variables should reference the MySQL service
3. Ensure `MYSQL_SSL=true` is set for Railway MySQL
4. Check MySQL service logs for errors

---

### Issue: "Missing required environment variables"

**Error:** Application exits on startup with environment validation error

**Solution:**
1. Go to Railway service → Variables tab
2. Check that all required variables are set:
   - `MYSQL_HOST`, `MYSQL_USER`, `MYSQL_PASSWORD`, `MYSQL_DATABASE`
   - `JWT_SECRET` (32+ characters)
   - `CSRF_SECRET` (32+ characters)
   - `FRONTEND_URL`
   - `NODE_ENV=production`
3. Verify variable names are correct (case-sensitive)
4. Check for typos in variable values

---

### Issue: "Port already in use" or "EADDRINUSE"

**Cause:** Railway automatically sets the PORT environment variable, but the app might be trying to use a hardcoded port.

**Solution:**
- The app already uses `process.env.PORT || 8080`, so this should work automatically
- If you see this error, check that Railway is setting the PORT variable
- Railway automatically sets PORT, so no manual configuration needed

---

### Issue: Build succeeds but app crashes on startup

**Solution:**
1. Check Railway logs for error messages
2. Common causes:
   - Missing environment variables
   - Database connection failure
   - Invalid configuration values
3. Look for specific error messages in logs
4. Verify all required services (MySQL) are running

---

### Issue: "SSL connection required"

**Error:** MySQL connection fails with SSL error

**Solution:**
1. Set `MYSQL_SSL=true` in environment variables
2. Set `MYSQL_SSL_REJECT_UNAUTHORIZED=false` for Railway MySQL
3. Verify MySQL service is using SSL (Railway MySQL requires SSL)

---

### Issue: Application doesn't start

**Checklist:**
1. ✅ Root directory set to `backend` in Railway settings
2. ✅ `package.json` exists in backend directory
3. ✅ All required environment variables set
4. ✅ MySQL service is running
5. ✅ Build logs show successful `npm install`
6. ✅ Start command is correct: `node app.js`
7. ✅ No errors in Railway logs

---

## Getting Help

If you're still experiencing issues:

1. **Check Railway Logs:**
   - Go to your service → Logs tab
   - Look for error messages
   - Check both build logs and runtime logs

2. **Verify Configuration:**
   - Root directory: `backend`
   - Build command: `npm install` (or automatic)
   - Start command: `node app.js`
   - All environment variables set

3. **Test Locally:**
   - Try running the app locally with production environment variables
   - This helps identify configuration issues

4. **Review Documentation:**
   - [Railway Deployment Guide](./RAILWAY_DEPLOYMENT.md)
   - [Railway Environment Checklist](./RAILWAY_ENV_CHECKLIST.md)
   - [Railway Official Docs](https://docs.railway.app)

---

## Quick Fixes

### Reset Service
1. Go to service → Settings
2. Click "Delete Service"
3. Create new service
4. Set root directory to `backend` immediately
5. Add all environment variables
6. Deploy

### Rebuild from Scratch
1. Delete the service
2. Create new service from GitHub
3. **First thing:** Set root directory to `backend`
4. Add MySQL service
5. Configure environment variables
6. Deploy

