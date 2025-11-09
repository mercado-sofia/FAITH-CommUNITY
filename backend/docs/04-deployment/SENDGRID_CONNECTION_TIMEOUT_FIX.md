# SendGrid Connection Timeout Fix

## Problem
Connection timeout errors when sending emails through SendGrid SMTP in deployed environments:
```
❌ Failed to send email: Connection timeout
Error: Connection timeout
code: 'ETIMEDOUT'
command: 'CONN'
```

## Root Causes

1. **Port 465 is blocked** - Many deployment platforms (Railway, Render, Heroku, etc.) block port 465
2. **Incorrect SendGrid credentials** - Wrong username or API key format
3. **Network/firewall restrictions** - Deployment platform blocking outbound SMTP connections
4. **Connection timeout too short** - Network latency in deployment environments

## Solution

### ✅ Step 1: Verify Environment Variables

Ensure these environment variables are set correctly in your deployment platform:

```env
# CRITICAL: Use port 587, NOT 465
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587

# CRITICAL: Username must be the literal string "apikey"
SMTP_USER=apikey

# Your SendGrid API key (not your SendGrid password)
SMTP_PASS=SG.your-actual-sendgrid-api-key-here

# Optional: Custom from address
MAIL_FROM="FAITH CommUNITY" <noreply@yourdomain.com>
```

### ✅ Step 2: Verify SendGrid API Key

1. Log in to your SendGrid account
2. Go to **Settings** → **API Keys**
3. Create a new API key with **Full Access** or **Mail Send** permissions
4. Copy the API key (it starts with `SG.`)
5. Use this API key as `SMTP_PASS` (NOT as `SMTP_USER`)

### ✅ Step 3: Common Mistakes to Avoid

❌ **WRONG:**
```env
SMTP_PORT=465          # Port 465 is often blocked
SMTP_USER=your-email   # Wrong! Must be "apikey"
SMTP_PASS=your-password # Wrong! Must be API key
```

✅ **CORRECT:**
```env
SMTP_PORT=587                    # Use port 587
SMTP_USER=apikey                 # Literal string "apikey"
SMTP_PASS=SG.xxxxxxxxxxxxx       # Your SendGrid API key
```

### ✅ Step 4: Platform-Specific Configuration

#### Railway
1. Go to your Railway project
2. Click on your service
3. Go to **Variables** tab
4. Add/update the environment variables above
5. Redeploy your service

#### Render
1. Go to your Render dashboard
2. Select your service
3. Go to **Environment** tab
4. Add/update the environment variables above
5. Save and redeploy

#### Heroku
1. Go to your Heroku dashboard
2. Select your app
3. Go to **Settings** → **Config Vars**
4. Add/update the environment variables above
5. Restart your dyno

### ✅ Step 5: Test Configuration

After updating environment variables, the application will automatically:
- Detect SendGrid configuration
- Use optimized timeout settings (90 seconds for SendGrid)
- Disable connection pooling (prevents connection issues)
- Provide detailed error messages if connection fails

### ✅ Step 6: Enable Debug Mode (Optional)

If you still experience issues, enable debug mode temporarily:

```env
SMTP_DEBUG=true
```

This will show detailed SMTP connection logs. **Remember to disable this in production** after troubleshooting.

## Code Improvements Made

The following optimizations have been implemented in `backend/src/utils/mailer.js`:

1. **SendGrid Detection** - Automatically detects SendGrid and applies optimizations
2. **Longer Timeouts** - 90 seconds for SendGrid (vs 60 seconds for others)
3. **Connection Pooling Disabled** - SendGrid works better without pooling
4. **DNS Caching Disabled** - Prevents stale DNS connections
5. **Automatic Retry Logic** - Retries failed connections with exponential backoff
6. **Better Error Messages** - Provides specific troubleshooting steps for SendGrid

## Verification

After deploying with the correct configuration, you should see:

```
✅ SMTP verification successful - email features are ready
```

If you see connection timeout errors, check:
1. ✅ `SMTP_PORT=587` (NOT 465)
2. ✅ `SMTP_USER=apikey` (literal string)
3. ✅ `SMTP_PASS` is your SendGrid API key (starts with `SG.`)
4. ✅ Your deployment platform allows outbound SMTP connections on port 587

## Still Having Issues? Use SendGrid REST API Instead

If SMTP continues to timeout (connection timeout at CONN stage), your deployment platform is likely blocking outbound SMTP connections. **Use SendGrid's REST API instead** - it uses HTTPS (port 443) which is almost never blocked.

### ✅ Solution: Enable SendGrid REST API

Add this environment variable to use SendGrid's REST API instead of SMTP:

```env
# Enable SendGrid REST API (uses HTTPS instead of SMTP)
USE_SENDGRID_API=true

# Still need these for SendGrid
SMTP_HOST=smtp.sendgrid.net  # (not used when USE_SENDGRID_API=true, but kept for compatibility)
SMTP_PASS=SG.your-sendgrid-api-key-here  # Required - your SendGrid API key
MAIL_FROM="FAITH CommUNITY" <faithcommunityfaces@gmail.com>
```

**Benefits of REST API:**
- ✅ Uses HTTPS (port 443) - almost never blocked
- ✅ More reliable in deployment environments
- ✅ Better error messages
- ✅ No connection pooling issues
- ✅ Faster than SMTP

**Note:** When `USE_SENDGRID_API=true`, the `SMTP_HOST`, `SMTP_PORT`, and `SMTP_USER` variables are not used. Only `SMTP_PASS` (your API key) and `MAIL_FROM` are required.

### Other Troubleshooting Steps

1. **Check SendGrid Dashboard** - Verify your API key is active and has correct permissions
2. **Test API Key** - Use SendGrid's API directly to verify the key works
3. **Check Platform Logs** - Look for more detailed error messages
4. **Contact Platform Support** - Some platforms may block SMTP connections; contact support to whitelist port 587 (or just use REST API instead)

