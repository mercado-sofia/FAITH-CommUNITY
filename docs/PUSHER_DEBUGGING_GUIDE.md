# Pusher Debugging Guide

## Issue: Notifications Not Appearing in Pusher Dashboard

If notifications are not showing up in the Pusher dashboard, follow these debugging steps:

---

## Step 1: Verify Environment Variables

### Check Backend `.env` File

Make sure your `backend/.env` file has all required variables:

```env
PUSHER_APP_ID=your-app-id
PUSHER_KEY=your-key
PUSHER_SECRET=your-secret
PUSHER_CLUSTER=ap1
```

**Important Notes:**
- No quotes around values
- No spaces around the `=` sign
- Values should match exactly what's in your Pusher dashboard
- `PUSHER_CLUSTER` should match your app's cluster (e.g., `ap1`, `us2`, `eu`)

### Check Frontend `.env.local` File

Make sure your `frontend/.env.local` file has:

```env
NEXT_PUBLIC_PUSHER_KEY=your-key
NEXT_PUBLIC_PUSHER_CLUSTER=ap1
```

**Note:** Use the same `PUSHER_KEY` and `PUSHER_CLUSTER` from backend.

---

## Step 2: Restart Your Server

**CRITICAL:** After adding/updating environment variables, you MUST restart your backend server:

```bash
# Stop the server (Ctrl+C)
# Then restart:
cd backend
npm run dev  # or npm start
```

Environment variables are only loaded when the server starts. Changes to `.env` won't take effect until restart.

---

## Step 3: Check Server Logs

When your backend server starts, look for these log messages:

### ✅ Success Messages:
```
🔍 [Pusher] Checking configuration...
✅ [Pusher] Initialized successfully
✅ Pusher is ready for real-time notifications
```

### ❌ Error Messages:
```
⚠️  [Pusher] Not configured. Missing environment variables
❌ [Pusher] Failed to initialize
```

**What to check:**
- If you see "Missing environment variables", verify your `.env` file
- If you see "Failed to initialize", check your credentials are correct
- If you see nothing, Pusher might not be initializing at all

---

## Step 4: Test Pusher Connection

Use the test endpoint to verify Pusher is working:

```bash
# In your browser or using curl:
http://localhost:8080/api/pusher/test
```

**Expected Response (Success):**
```json
{
  "success": true,
  "message": "Pusher is configured and working",
  "pusher": {
    "initialized": true,
    "cluster": "ap1",
    "testPublish": "success"
  }
}
```

**If it fails:**
- Check the error message
- Verify environment variables are loaded
- Check server logs for detailed errors

---

## Step 5: Check Notification Creation Logs

When you trigger a notification, check your server logs for:

### ✅ Success Logs:
```
📤 [Pusher] Attempting to publish notification...
✅ [Pusher] Notification published successfully
```

### ❌ Error Logs:
```
⚠️  [Pusher] Not available. Notification not published
❌ [Pusher] Failed to publish notification
```

**What to check:**
- If you see "Not available", Pusher didn't initialize (check Step 3)
- If you see "Failed to publish", check the error details in logs
- If you see nothing, the notification function might not be called

---

## Step 6: Verify Notification Function is Called

Check if `publishNotification` is actually being called:

1. **Check server logs** when creating a notification
2. Look for: `📤 [Pusher] Attempting to publish notification...`
3. If you don't see this log, the function isn't being called

**Possible reasons:**
- Notification creation failed before reaching Pusher
- Database insert failed
- Function not imported correctly

---

## Step 7: Verify Pusher Dashboard Settings

1. **Go to your Pusher Dashboard**
2. **Check your app settings:**
   - App ID matches `PUSHER_APP_ID`
   - Key matches `PUSHER_KEY`
   - Secret matches `PUSHER_SECRET`
   - Cluster matches `PUSHER_CLUSTER`

3. **Check "Debug Console" tab:**
   - Should show connection attempts
   - Should show published events

4. **Check "Channels" tab:**
   - Should list active channels
   - Should show message counts

---

## Common Issues and Solutions

### Issue 1: "Missing environment variables"

**Solution:**
- Verify `.env` file exists in `backend/` directory
- Check variable names are exact (case-sensitive)
- Ensure no typos in variable names
- Restart server after adding variables

### Issue 2: "Failed to initialize Pusher"

**Solution:**
- Verify credentials are correct
- Check cluster matches your app's cluster
- Ensure no extra spaces in `.env` values
- Try regenerating credentials in Pusher dashboard

### Issue 3: "Notification published" but nothing in dashboard

**Solution:**
- Check you're looking at the correct Pusher app
- Verify cluster matches
- Check "Debug Console" for events
- Wait a few seconds (dashboard updates may be delayed)

### Issue 4: No logs at all

**Solution:**
- Verify server is running
- Check console output is not being suppressed
- Ensure you're looking at the correct terminal/window
- Check if logging is disabled in production

### Issue 5: Works in test endpoint but not in notifications

**Solution:**
- Check notification creation function is being called
- Verify `publishNotification` is imported correctly
- Check for errors in notification creation (database, etc.)
- Ensure notification ID is created successfully

---

## Testing Checklist

- [ ] Environment variables added to `.env` file
- [ ] Server restarted after adding variables
- [ ] Server logs show "Pusher initialized successfully"
- [ ] Test endpoint (`/api/pusher/test`) returns success
- [ ] Creating notification shows "Attempting to publish" log
- [ ] Creating notification shows "published successfully" log
- [ ] Pusher dashboard shows connection
- [ ] Pusher dashboard shows events/messages

---

## Still Not Working?

If you've checked everything above and it's still not working:

1. **Share your server logs** (with sensitive data redacted)
2. **Share the response from** `/api/pusher/test` endpoint
3. **Check Pusher dashboard** for any error messages
4. **Verify your Pusher account** is active and not suspended
5. **Check your network/firewall** isn't blocking Pusher connections

---

## Quick Test Script

Run this to test Pusher end-to-end:

```bash
# 1. Test Pusher initialization
curl http://localhost:8080/api/pusher/test

# 2. Create a test notification (replace userId with actual ID)
# This will trigger the notification creation which should publish to Pusher
```

---

**Last Updated:** After adding enhanced logging and test endpoint

