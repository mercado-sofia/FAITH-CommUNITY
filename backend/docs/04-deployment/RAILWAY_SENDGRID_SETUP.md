# Railway SendGrid Setup Guide

## Quick Checklist for Railway Deployment

### ✅ Required Environment Variables in Railway

Go to your Railway project → Your service → **Variables** tab and ensure these are set:

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

## Step-by-Step Setup

### Step 1: Verify SendGrid API Key

1. Log in to [SendGrid Dashboard](https://app.sendgrid.com)
2. Go to **Settings** → **API Keys**
3. Create a new API key with **Full Access** or **Mail Send** permissions
4. Copy the API key (it starts with `SG.`)
5. **Important:** You can only see the key once - copy it immediately!

### Step 2: Verify Sender Email in SendGrid

1. In SendGrid Dashboard, go to **Settings** → **Sender Authentication**
2. Click **Single Sender Verification**
3. Add `faithcommunityfaces@gmail.com`
4. Verify the email address (check your inbox for verification email)

### Step 3: Set Environment Variables in Railway

1. Go to [Railway Dashboard](https://railway.app)
2. Select your project
3. Click on your backend service
4. Go to **Variables** tab
5. Add/update these variables:

   **Variable Name:** `USE_SENDGRID_API`  
   **Value:** `true`

   **Variable Name:** `SMTP_PASS`  
   **Value:** `SG.your-actual-sendgrid-api-key-here`  
   *(Replace with your actual API key)*

   **Variable Name:** `MAIL_FROM`  
   **Value:** `"FAITH CommUNITY" <faithcommunityfaces@gmail.com>`

### Step 4: Redeploy

After setting the environment variables:
1. Railway will automatically redeploy
2. Or manually trigger a redeploy from the **Deployments** tab

### Step 5: Verify Configuration

Check your Railway logs after deployment. You should see:

```
✅ SendGrid API configured - email features are ready
   → Using SendGrid SDK (HTTPS) instead of SMTP
```

If you see errors, check the troubleshooting section below.

## Common Issues

### Issue 1: "SendGrid API not configured"

**Problem:** `SMTP_PASS` or `SENDGRID_API_KEY` is not set or empty.

**Solution:**
1. Go to Railway → Variables
2. Check that `SMTP_PASS` or `SENDGRID_API_KEY` is set
3. Make sure the value starts with `SG.`
4. Remove any extra spaces or quotes
5. Redeploy

### Issue 2: "USE_SENDGRID_API is not 'true'"

**Problem:** The environment variable is not set to exactly `true` (case-sensitive).

**Solution:**
1. Go to Railway → Variables
2. Set `USE_SENDGRID_API` to exactly `true` (lowercase, no quotes)
3. Do NOT use: `"true"`, `TRUE`, `True`, or `'true'`
4. Redeploy

### Issue 3: "Email sending failed: Unauthorized"

**Problem:** SendGrid API key is invalid or doesn't have correct permissions.

**Solution:**
1. Verify your API key in SendGrid Dashboard
2. Make sure the API key has **Mail Send** or **Full Access** permissions
3. Create a new API key if needed
4. Update `SMTP_PASS` in Railway with the new key
5. Redeploy

### Issue 4: "Email sending failed: Forbidden"

**Problem:** The sender email (`faithcommunityfaces@gmail.com`) is not verified in SendGrid.

**Solution:**
1. Go to SendGrid Dashboard → Settings → Sender Authentication
2. Click **Single Sender Verification**
3. Add and verify `faithcommunityfaces@gmail.com`
4. Check your email inbox for verification email
5. Click the verification link

### Issue 5: Still using SMTP instead of API

**Problem:** `USE_SENDGRID_API` is not set or not set to `true`.

**Solution:**
1. Check Railway logs - you should see "Using SendGrid SDK (HTTPS) instead of SMTP"
2. If you see "SMTP verification" messages, `USE_SENDGRID_API` is not set correctly
3. Go to Railway → Variables
4. Set `USE_SENDGRID_API=true` (exactly, no quotes)
5. Redeploy

## Testing

After deployment, test email sending:

1. Try sending an invitation from your superadmin panel
2. Check Railway logs for any errors
3. If it fails, check the error message in the logs

## Debugging

### Check Railway Logs

1. Go to Railway → Your service → **Deployments**
2. Click on the latest deployment
3. View the logs
4. Look for:
   - `✅ SendGrid API configured` - Good!
   - `⚠️ SendGrid API not configured` - Check your variables
   - `❌ Failed to send email` - Check the error message

### Verify Environment Variables

Add this temporary endpoint to check your environment variables (remove after debugging):

```javascript
// In a controller or route
app.get('/debug/email-config', (req, res) => {
  res.json({
    useSendGridAPI: process.env.USE_SENDGRID_API,
    hasApiKey: !!(process.env.SMTP_PASS || process.env.SENDGRID_API_KEY),
    mailFrom: process.env.MAIL_FROM,
    // Don't expose the actual API key!
    apiKeyPrefix: process.env.SMTP_PASS?.substring(0, 5) || process.env.SENDGRID_API_KEY?.substring(0, 5) || 'not set'
  });
});
```

**⚠️ IMPORTANT:** Remove this endpoint after debugging - it exposes configuration information!

## Still Having Issues?

1. **Check SendGrid Dashboard** - Verify your API key is active
2. **Check SendGrid Activity** - Go to Activity → Email Activity to see if emails are being sent
3. **Check Railway Logs** - Look for detailed error messages
4. **Verify Email Verification** - Make sure `faithcommunityfaces@gmail.com` is verified in SendGrid
5. **Test API Key** - Use SendGrid's API directly to verify the key works

## Environment Variable Summary

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

