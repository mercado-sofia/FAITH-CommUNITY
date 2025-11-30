# Pusher Real-time Notifications Guide

This comprehensive guide covers everything you need to know about Pusher real-time notifications in the FAITH CommUNITY application, including setup, implementation, debugging, and troubleshooting.

---

## Table of Contents

1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Setup & Configuration](#setup--configuration)
4. [Implementation Details](#implementation-details)
5. [How It Works](#how-it-works)
6. [Debugging & Troubleshooting](#debugging--troubleshooting)
7. [Testing Checklist](#testing-checklist)
8. [Security Notes](#security-notes)
9. [Cost Considerations](#cost-considerations)
10. [Additional Resources](#additional-resources)

---

## Overview

Pusher is used to deliver real-time notifications to users without requiring page refresh. When a new notification is created, it's instantly pushed to the user's browser via WebSocket connections.

### Key Features

- Real-time notification delivery via WebSocket
- Private channel authentication for security
- Automatic fallback to polling if Pusher unavailable
- Support for users, admins, and superadmins
- Toast popup notifications
- Automatic notification list refresh

---

## Prerequisites

1. Create a Pusher account at [pusher.com](https://pusher.com)
2. Create a new Pusher app in your dashboard
3. Note down your app credentials:
   - App ID
   - Key
   - Secret
   - Cluster (e.g., `us2`, `eu`, `ap1`)

---

## Setup & Configuration

### Backend Environment Variables (Railway/Server)

Add these to your backend `.env` file or Railway environment variables:

```env
# Pusher Configuration
PUSHER_APP_ID=your-app-id-here
PUSHER_KEY=your-key-here
PUSHER_SECRET=your-secret-here
PUSHER_CLUSTER=us2
```

**Important Notes:**
- No quotes around values
- No spaces around the `=` sign
- Values should match exactly what's in your Pusher dashboard
- `PUSHER_CLUSTER` should match your app's cluster (e.g., `ap1`, `us2`, `eu`)

### Frontend Environment Variables (Vercel)

Add these to your Vercel project environment variables (Settings → Environment Variables):

```env
# Pusher Configuration (Public - accessible in browser)
NEXT_PUBLIC_PUSHER_KEY=your-key-here
NEXT_PUBLIC_PUSHER_CLUSTER=us2
```

**Note:** 
- Only the `KEY` and `CLUSTER` are needed on the frontend (they're public)
- The `SECRET` and `APP_ID` should NEVER be exposed to the frontend
- Use the same `KEY` and `CLUSTER` values in both backend and frontend

### Restart Your Server

**CRITICAL:** After adding/updating environment variables, you MUST restart your backend server:

```bash
# Stop the server (Ctrl+C)
# Then restart:
cd backend
npm run dev  # or npm start
```

Environment variables are only loaded when the server starts. Changes to `.env` won't take effect until restart.

---

## Implementation Details

### Backend Implementation

#### Dependencies
- **File**: `backend/package.json`
- **Status**: `pusher: ^5.2.0` required

#### Core Pusher Utility
- **File**: `backend/src/utils/pusher.js`
- **Functions**:
  - `getPusher()` - Initializes Pusher server instance
  - `publishNotification()` - Publishes notifications to channels
  - `authenticateChannel()` - Authenticates private channel subscriptions

#### User Notifications
- **File**: `backend/src/(public)/controllers/userController.js`
- **Function**: `createUserNotification()`
  - Publishes to: `private-user-${userId}`
  - Imports: `publishNotification` ✅
- **Authentication**: `authenticatePusher()`
  - Route: `/api/users/pusher/auth`
  - Imports: `authenticateChannel` ✅

#### Admin Notifications
- **File**: `backend/src/admin/controllers/notificationController.js`
- **Function**: `createNotification()`
  - Publishes to: `private-admin-${adminId}`
  - Imports: `publishNotification, authenticateChannel` ✅
- **Authentication**: `authenticatePusher()`
  - Route: `/api/notifications/pusher/auth`
  - Imports: `authenticateChannel` ✅

#### Superadmin Notifications
- **File**: `backend/src/superadmin/controllers/superadminNotificationController.js`
- **Function**: `createNotification()`
  - Publishes to: `private-superadmin-${superAdminId}`
  - Imports: `publishNotification, authenticateChannel` ✅
- **Authentication**: `authenticatePusher()`
  - Route: `/api/superadmin/notifications/pusher/auth`
  - Imports: `authenticateChannel` ✅

#### Routes Configuration
- **User Route**: `backend/src/(public)/routes/users.js`
  - ✅ `/api/users/pusher/auth` endpoint added
- **Admin Route**: `backend/src/admin/routes/notifications.js`
  - ✅ `/api/notifications/pusher/auth` endpoint added
- **Superadmin Route**: `backend/src/superadmin/routes/notifications.js`
  - ✅ `/api/superadmin/notifications/pusher/auth` endpoint added

### Frontend Implementation

#### Dependencies
- **File**: `frontend/package.json`
- **Status**: `pusher-js: ^8.4.0` required

#### Pusher Client Utility
- **File**: `frontend/src/utils/pusherClient.js`
- **Functions**:
  - `getPusherClient()` - Initializes Pusher client
  - `disconnectPusher()` - Disconnects client
  - `getPusherConnectionStatus()` - Gets connection status
  - `getAuthEndpoint()` - Returns correct auth endpoint based on user type

#### Pusher Notifications Hook
- **File**: `frontend/src/hooks/shared/usePusherNotifications.js`
- **Features**:
  - Subscribes to private channels based on user type
  - Handles subscription success/error events
  - Listens for `new-notification` events
  - Proper cleanup on unmount

#### User Notifications Hook
- **File**: `frontend/src/hooks/shared/useNotifications.js`
- **Integration**:
  - ✅ Uses `usePusherNotifications` hook
  - ✅ Handles real-time notifications
  - ✅ Shows toast popups
  - ✅ Refetches data on new notification
  - ✅ Fallback polling (60 seconds)

#### Admin Notifications Hook
- **File**: `frontend/src/hooks/shared/useAdminNotifications.js`
- **Integration**:
  - ✅ Uses `usePusherNotifications` hook
  - ✅ Handles both admin and superadmin types
  - ✅ Shows toast popups
  - ✅ Refetches data on new notification
  - ✅ Fallback polling (60 seconds)

### Notification Creation Coverage

All notification creation points have been verified to use Pusher:

#### User Notifications
- `createUserNotification()` in `userController.js` ✅
- Used by: `volunteerController.js` ✅

#### Admin Notifications
- `NotificationController.createNotification()` ✅
- Used by:
  - `collaborationController.js` ✅
  - `programsController.js` ✅
  - `messagesController.js` ✅
  - `approvalController.js` ✅
  - `collaboratorNotification.js` ✅

#### Superadmin Notifications
- `SuperAdminNotificationController.createNotification()` ✅
- Used by:
  - `programsController.js` ✅
  - `submissionController.js` ✅
  - `postActReportController.js` ✅
  - `approvalController.js` ✅
  - `invitationController.js` ✅

### Channel Names

All channel names follow the correct pattern:
- ✅ Users: `private-user-{userId}`
- ✅ Admins: `private-admin-{adminId}`
- ✅ Superadmins: `private-superadmin-{superAdminId}`

---

## How It Works

1. **Backend**: When a notification is created, it's:
   - Saved to the database
   - Published to a Pusher private channel (`private-user-{userId}`, `private-admin-{adminId}`, or `private-superadmin-{superAdminId}`)

2. **Frontend**: The client:
   - Subscribes to their private channel on page load
   - Receives real-time notifications via WebSocket
   - Displays notifications as popups using the Toast system
   - Automatically refetches the notification list

3. **Authentication**: Private channels require authentication:
   - Frontend requests channel authorization from backend
   - Backend verifies JWT token and authorizes the channel
   - Pusher establishes secure WebSocket connection

### Fallback Mechanism

If Pusher is not configured or connection fails:
- The system falls back to polling every 60 seconds
- Notifications will still work, but with a delay
- No errors will be shown to users

---

## Debugging & Troubleshooting

### Step 1: Verify Environment Variables

#### Check Backend `.env` File

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

#### Check Frontend `.env.local` File

Make sure your `frontend/.env.local` file has:

```env
NEXT_PUBLIC_PUSHER_KEY=your-key
NEXT_PUBLIC_PUSHER_CLUSTER=ap1
```

**Note:** Use the same `PUSHER_KEY` and `PUSHER_CLUSTER` from backend.

### Step 2: Restart Your Server

**CRITICAL:** After adding/updating environment variables, you MUST restart your backend server:

```bash
# Stop the server (Ctrl+C)
# Then restart:
cd backend
npm run dev  # or npm start
```

Environment variables are only loaded when the server starts. Changes to `.env` won't take effect until restart.

### Step 3: Check Server Logs

When your backend server starts, look for these log messages:

#### ✅ Success Messages:
```
🔍 [Pusher] Checking configuration...
✅ [Pusher] Initialized successfully
✅ Pusher is ready for real-time notifications
```

#### ❌ Error Messages:
```
⚠️  [Pusher] Not configured. Missing environment variables
❌ [Pusher] Failed to initialize
```

**What to check:**
- If you see "Missing environment variables", verify your `.env` file
- If you see "Failed to initialize", check your credentials are correct
- If you see nothing, Pusher might not be initializing at all

### Step 4: Test Pusher Connection

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

### Step 5: Check Notification Creation Logs

When you trigger a notification, check your server logs for:

#### ✅ Success Logs:
```
📤 [Pusher] Attempting to publish notification...
✅ [Pusher] Notification published successfully
```

#### ❌ Error Logs:
```
⚠️  [Pusher] Not available. Notification not published
❌ [Pusher] Failed to publish notification
```

**What to check:**
- If you see "Not available", Pusher didn't initialize (check Step 3)
- If you see "Failed to publish", check the error details in logs
- If you see nothing, the notification function might not be called

### Step 6: Verify Notification Function is Called

Check if `publishNotification` is actually being called:

1. **Check server logs** when creating a notification
2. Look for: `📤 [Pusher] Attempting to publish notification...`
3. If you don't see this log, the function isn't being called

**Possible reasons:**
- Notification creation failed before reaching Pusher
- Database insert failed
- Function not imported correctly

### Step 7: Verify Pusher Dashboard Settings

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

### Common Issues and Solutions

#### Issue 1: "Missing environment variables"

**Solution:**
- Verify `.env` file exists in `backend/` directory
- Check variable names are exact (case-sensitive)
- Ensure no typos in variable names
- Restart server after adding variables

#### Issue 2: "Failed to initialize Pusher"

**Solution:**
- Verify credentials are correct
- Check cluster matches your app's cluster
- Ensure no extra spaces in `.env` values
- Try regenerating credentials in Pusher dashboard

#### Issue 3: "Notification published" but nothing in dashboard

**Solution:**
- Check you're looking at the correct Pusher app
- Verify cluster matches
- Check "Debug Console" for events
- Wait a few seconds (dashboard updates may be delayed)

#### Issue 4: No logs at all

**Solution:**
- Verify server is running
- Check console output is not being suppressed
- Ensure you're looking at the correct terminal/window
- Check if logging is disabled in production

#### Issue 5: Works in test endpoint but not in notifications

**Solution:**
- Check notification creation function is being called
- Verify `publishNotification` is imported correctly
- Check for errors in notification creation (database, etc.)
- Ensure notification ID is created successfully

#### Issue 6: Notifications Not Appearing in Real-time

**Check Environment Variables:**
- Verify all Pusher env variables are set correctly
- Check for typos in variable names
- Ensure values match between backend and frontend

**Check Browser Console:**
- Look for Pusher connection errors
- Check for authentication errors
- Verify WebSocket connection is established

**Check Backend Logs:**
- Look for Pusher initialization messages
- Check for errors when publishing notifications
- Verify authentication endpoints are working

#### Issue 7: Connection Issues

- **WebSocket blocked**: Some corporate networks block WebSocket connections
- **Firewall**: Ensure WebSocket ports are not blocked
- **Pusher Dashboard**: Check your Pusher dashboard for connection statistics

### Quick Test Script

Run this to test Pusher end-to-end:

```bash
# 1. Test Pusher initialization
curl http://localhost:8080/api/pusher/test

# 2. Create a test notification (replace userId with actual ID)
# This will trigger the notification creation which should publish to Pusher
```

### Still Not Working?

If you've checked everything above and it's still not working:

1. **Share your server logs** (with sensitive data redacted)
2. **Share the response from** `/api/pusher/test` endpoint
3. **Check Pusher dashboard** for any error messages
4. **Verify your Pusher account** is active and not suspended
5. **Check your network/firewall** isn't blocking Pusher connections

---

## Testing Checklist

### Setup Verification
- [ ] Environment variables added to `.env` file
- [ ] Server restarted after adding variables
- [ ] Server logs show "Pusher initialized successfully"
- [ ] Test endpoint (`/api/pusher/test`) returns success

### Real-time Delivery
- [ ] Backend Pusher initialization (check server logs)
- [ ] Frontend Pusher connection (check browser console)
- [ ] User notification real-time delivery
- [ ] Admin notification real-time delivery
- [ ] Superadmin notification real-time delivery
- [ ] Toast popup display on new notification
- [ ] Notification list auto-refresh

### Functionality
- [ ] Creating notification shows "Attempting to publish" log
- [ ] Creating notification shows "published successfully" log
- [ ] Pusher dashboard shows connection
- [ ] Pusher dashboard shows events/messages
- [ ] Fallback polling when Pusher unavailable
- [ ] Channel authentication (unauthorized access blocked)

### Testing Scenarios

1. **Test Real-time Delivery**:
   - Open the application in two browser windows
   - Log in as different users (or same user in different windows)
   - Create a notification for one user
   - Verify it appears instantly in the other window

2. **Test Authentication**:
   - Try accessing a channel you're not authorized for
   - Verify you get a 403 error

3. **Test Fallback**:
   - Disable Pusher (remove env variables)
   - Verify notifications still work via polling

---

## Security Notes

1. **Private Channels**: All notification channels are private and require authentication
2. **JWT Verification**: Backend verifies JWT tokens before authorizing channels
3. **Channel Access**: Users can only subscribe to their own channels
4. **Secrets**: Never expose `PUSHER_SECRET` or `PUSHER_APP_ID` to the frontend
5. **Secure Connections**: WebSocket connections are encrypted (WSS)
6. **Token Validation**: All channel authentication requests validate JWT tokens

---

## Cost Considerations

- Pusher offers a free tier with:
  - 200,000 messages/day
  - 100 concurrent connections
  - Unlimited channels

- For production, consider:
  - Monitoring message usage
  - Upgrading plan if needed
  - Implementing message batching if volume is high

---

## Additional Resources

- [Pusher Documentation](https://pusher.com/docs)
- [Pusher JavaScript Client](https://github.com/pusher/pusher-js)
- [Pusher Node.js Server](https://github.com/pusher/pusher-http-node)

---

## Implementation Status

**Status**: ✅ **IMPLEMENTATION COMPLETE**

All files have been updated and integrated correctly:
- ✅ All notification creation functions publish to Pusher
- ✅ All authentication endpoints are configured
- ✅ All frontend hooks are integrated
- ✅ All imports are correct
- ✅ All routes are registered
- ✅ Dependencies are added to package.json files

**Remaining Steps** (if not already done):
1. Add frontend environment variables (`NEXT_PUBLIC_PUSHER_KEY`, `NEXT_PUBLIC_PUSHER_CLUSTER`)
2. Run `npm install` in both backend and frontend directories
3. Test the implementation

---

**Last Updated**: After consolidation of all Pusher documentation

