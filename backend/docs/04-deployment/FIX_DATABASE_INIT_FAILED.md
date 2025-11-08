# Fix "Database initialization failed" Error

## The Problem

Your backend can't connect to the MySQL database. This usually means:

1. **MySQL service is not running** in Railway
2. **Wrong MySQL connection variables**
3. **SSL configuration issue**
4. **Network connectivity problem**

## Step 1: Check MySQL Service is Running

1. Go to Railway Dashboard
2. Look for your **MySQL service** (should be a separate service)
3. Make sure it shows **"Running"** or **"Active"**
4. If it's not running, click on it and start it

## Step 2: Verify MySQL Environment Variables

Go to Railway → **Backend Service** → **Variables** tab and verify these are set:

### Required MySQL Variables:

```env
MYSQL_HOST=mysql.railway.internal
# OR use the MySQL service name (check your MySQL service)
```

**Important:** The `MYSQL_HOST` should be:
- `mysql.railway.internal` (if MySQL is in the same project)
- OR the MySQL service name (e.g., `${{MySQL.MYSQLHOST}}`)

### Check Your MySQL Variables:

1. Go to Railway → **MySQL Service** → **Variables** tab
2. You should see variables like:
   - `MYSQLHOST`
   - `MYSQLPORT`
   - `MYSQLUSER`
   - `MYSQLPASSWORD`
   - `MYSQLDATABASE`

3. In your **Backend Service** → **Variables**, use Railway's variable references:

```env
MYSQL_HOST=${{MySQL.MYSQLHOST}}
MYSQL_PORT=${{MySQL.MYSQLPORT}}
MYSQL_USER=${{MySQL.MYSQLUSER}}
MYSQL_PASSWORD=${{MySQL.MYSQLPASSWORD}}
MYSQL_DATABASE=${{MySQL.MYSQLDATABASE}}
```

**OR** if Railway doesn't support `${{}}` syntax, copy the actual values:

1. Go to MySQL service → Variables
2. Copy the actual values
3. Paste them in Backend service → Variables

### Required SSL Variables:

```env
MYSQL_SSL=true
MYSQL_SSL_REJECT_UNAUTHORIZED=false
```

**These are REQUIRED for Railway MySQL!**

## Step 3: Check the Specific Error

1. Go to Railway → Backend Service → **Deployments** tab
2. Click **"View logs"** on the latest deployment
3. Look for the **exact error message**, for example:
   - `Error: connect ECONNREFUSED` - Can't reach MySQL
   - `Error: Access denied` - Wrong credentials
   - `Error: Unknown database` - Wrong database name
   - `Error: SSL connection required` - SSL not configured

## Step 4: Common Fixes

### Fix 1: MySQL Service Not Running

**Error:** `ECONNREFUSED` or `Connection refused`

**Solution:**
1. Go to Railway → MySQL Service
2. Make sure it's **running**
3. If not, start it
4. Wait for it to fully start (check logs)

### Fix 2: Wrong MYSQL_HOST

**Error:** `getaddrinfo ENOTFOUND` or `ECONNREFUSED`

**Solution:**
1. Check your MySQL service name in Railway
2. Update `MYSQL_HOST` to:
   - `mysql.railway.internal` (if in same project)
   - OR the actual MySQL service hostname
3. Verify using Railway's variable reference: `${{MySQL.MYSQLHOST}}`

### Fix 3: SSL Not Configured

**Error:** `SSL connection required` or `SSL error`

**Solution:**
1. Make sure these are set in Backend Variables:
   ```
   MYSQL_SSL=true
   MYSQL_SSL_REJECT_UNAUTHORIZED=false
   ```
2. These are **REQUIRED** for Railway MySQL

### Fix 4: Wrong Database Name

**Error:** `Unknown database 'db_community'`

**Solution:**
1. Check your MySQL service → Variables
2. Find `MYSQLDATABASE` value
3. Update Backend `MYSQL_DATABASE` to match
4. Usually it's `railway` for Railway MySQL

### Fix 5: Wrong Credentials

**Error:** `Access denied for user`

**Solution:**
1. Go to MySQL service → Variables
2. Copy the exact values for:
   - `MYSQLUSER`
   - `MYSQLPASSWORD`
3. Update Backend variables to match exactly

## Step 5: Quick Checklist

Before checking logs, verify:

- [ ] MySQL service is **running** in Railway
- [ ] `MYSQL_HOST` is set correctly (use `${{MySQL.MYSQLHOST}}` or `mysql.railway.internal`)
- [ ] `MYSQL_PORT` is set (usually `3306`)
- [ ] `MYSQL_USER` matches MySQL service user
- [ ] `MYSQL_PASSWORD` matches MySQL service password
- [ ] `MYSQL_DATABASE` matches MySQL service database name
- [ ] `MYSQL_SSL=true` is set
- [ ] `MYSQL_SSL_REJECT_UNAUTHORIZED=false` is set

## Step 6: Test Connection

After fixing the variables:

1. Railway will **automatically redeploy** (or trigger a redeploy)
2. Check the logs again
3. You should see: `✅ Database initialized successfully`
4. If still failing, share the **exact error message** from the logs

## What to Share

If you need help, share:

1. **The exact error message** from Railway logs
2. **Screenshot** of your Backend Variables tab (hide sensitive values)
3. **Screenshot** of your MySQL service status
4. **Screenshot** of your MySQL Variables tab (hide sensitive values)

## After Fixing

Once the database connection works:

1. Railway will automatically redeploy
2. Check logs for: `✅ Database initialized successfully`
3. Your backend should start successfully
4. Test your health endpoint: `https://your-backend.railway.app/api/health`

