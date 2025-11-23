# Deployment Configuration for Vercel + Railway (Socket.io Real-time Notifications)

## Environment Variables Required

### Frontend (Vercel)
Set these in Vercel Dashboard → Settings → Environment Variables:

```
NEXT_PUBLIC_API_URL=https://your-backend.railway.app
```

**Important**: 
- Replace `your-backend.railway.app` with your actual Railway backend URL
- The URL should NOT have a trailing slash
- This must be set at build time (NEXT_PUBLIC_* variables are embedded during build)

### Backend (Railway)
Set these in Railway Dashboard → Variables:

```
ALLOWED_ORIGINS=https://your-frontend.vercel.app,https://your-frontend-git-main.vercel.app
NODE_ENV=production
TRUST_PROXY=true
COOKIE_SAMESITE=none
```

**Important**:
- Replace `your-frontend.vercel.app` with your actual Vercel frontend URL
- Include both the main domain and preview deployment URLs if needed
- `COOKIE_SAMESITE=none` is required for cross-domain cookies (Vercel → Railway)
- `TRUST_PROXY=true` is required for Railway's reverse proxy

## Socket.io Configuration

### How It Works
1. **Frontend (Vercel)**: Client-side Socket.io connects directly to Railway backend
2. **Backend (Railway)**: Socket.io server runs on the same HTTP server as Express
3. **Authentication**: Uses JWT cookies (httpOnly, Secure, SameSite=None for cross-domain)

### Connection Flow
```
Vercel Frontend (Browser) 
  → WebSocket/Polling Connection 
  → Railway Backend (Socket.io Server)
  → Authenticates via JWT Cookie
  → Joins user-specific room
```

## Testing After Deployment

1. **Check Browser Console**:
   - Look for: `🔌 Attempting to connect to Socket.io server at: https://your-backend.railway.app`
   - Look for: `✅ Socket.io connected: [socket-id]`
   - If you see connection errors, check CORS and ALLOWED_ORIGINS

2. **Check Backend Logs** (Railway):
   - Look for: `Socket connected: User X (email@example.com)`
   - When notification is sent: `📤 Notification emitted to room "user:X"`

3. **Test Real-time Notifications**:
   - Have an admin update a volunteer application status
   - Check browser console for: `🔔 Real-time notification received:`
   - Notification should appear without page refresh

## Troubleshooting

### Socket.io Not Connecting
- **Check CORS**: Ensure Vercel URL is in `ALLOWED_ORIGINS` on Railway
- **Check URL**: Verify `NEXT_PUBLIC_API_URL` is set correctly in Vercel
- **Check Cookies**: Ensure cookies are being sent (check browser DevTools → Application → Cookies)
- **Check HTTPS**: Both Vercel and Railway must use HTTPS in production

### Cookies Not Working
- **SameSite=None**: Required for cross-domain (Vercel → Railway)
- **Secure=true**: Required when SameSite=None (automatic in production)
- **Domain**: Don't set cookie domain attribute for cross-domain cookies

### Notifications Not Appearing
- **Check Socket Connection**: Verify socket is connected (browser console)
- **Check User ID**: Ensure the user ID matches between notification and socket room
- **Check Backend Logs**: Verify notification is being emitted
- **Check Network**: Verify WebSocket connection is established (DevTools → Network → WS)

## Important Notes

1. **Vercel Serverless**: Socket.io client runs in the browser, not on Vercel's serverless functions. This is correct and will work.

2. **Railway Persistent Connection**: Railway keeps the backend server running, which is required for Socket.io to maintain persistent connections.

3. **Cookie Security**: Cross-domain cookies require `SameSite=None` and `Secure=true`. This is automatically handled by the code when cross-domain is detected.

4. **CORS**: Both Express CORS and Socket.io CORS must allow the Vercel origin.

5. **WebSocket vs Polling**: Socket.io will try WebSocket first, then fall back to polling if needed. This ensures compatibility across different network configurations.

