# Pusher Real-time Notifications Setup Guide

This guide explains how to set up Pusher for real-time notifications in the FAITH CommUNITY application.

## Overview

Pusher is used to deliver real-time notifications to users without requiring page refresh. When a new notification is created, it's instantly pushed to the user's browser via WebSocket connections.

## Prerequisites

1. Create a Pusher account at [pusher.com](https://pusher.com)
2. Create a new Pusher app in your dashboard
3. Note down your app credentials:
   - App ID
   - Key
   - Secret
   - Cluster (e.g., `us2`, `eu`, `ap1`)

## Environment Variables

### Backend Environment Variables (Railway/Server)

Add these to your backend `.env` file or Railway environment variables:

```env
# Pusher Configuration
PUSHER_APP_ID=your-app-id-here
PUSHER_KEY=your-key-here
PUSHER_SECRET=your-secret-here
PUSHER_CLUSTER=us2
```

**Note:** Replace the placeholder values with your actual Pusher credentials.

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

## Channel Names

- **Users**: `private-user-{userId}`
- **Admins**: `private-admin-{adminId}`
- **Superadmins**: `private-superadmin-{superAdminId}`

## Fallback Mechanism

If Pusher is not configured or connection fails:
- The system falls back to polling every 60 seconds
- Notifications will still work, but with a delay
- No errors will be shown to users

## Testing

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

## Troubleshooting

### Notifications Not Appearing in Real-time

1. **Check Environment Variables**:
   - Verify all Pusher env variables are set correctly
   - Check for typos in variable names
   - Ensure values match between backend and frontend

2. **Check Browser Console**:
   - Look for Pusher connection errors
   - Check for authentication errors
   - Verify WebSocket connection is established

3. **Check Backend Logs**:
   - Look for Pusher initialization messages
   - Check for errors when publishing notifications
   - Verify authentication endpoints are working

### Connection Issues

- **WebSocket blocked**: Some corporate networks block WebSocket connections
- **Firewall**: Ensure WebSocket ports are not blocked
- **Pusher Dashboard**: Check your Pusher dashboard for connection statistics

## Security Notes

1. **Private Channels**: All notification channels are private and require authentication
2. **JWT Verification**: Backend verifies JWT tokens before authorizing channels
3. **Channel Access**: Users can only subscribe to their own channels
4. **Secrets**: Never expose `PUSHER_SECRET` or `PUSHER_APP_ID` to the frontend

## Cost Considerations

- Pusher offers a free tier with:
  - 200,000 messages/day
  - 100 concurrent connections
  - Unlimited channels

- For production, consider:
  - Monitoring message usage
  - Upgrading plan if needed
  - Implementing message batching if volume is high

## Additional Resources

- [Pusher Documentation](https://pusher.com/docs)
- [Pusher JavaScript Client](https://github.com/pusher/pusher-js)
- [Pusher Node.js Server](https://github.com/pusher/pusher-http-node)

