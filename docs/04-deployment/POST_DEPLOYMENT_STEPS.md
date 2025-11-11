# Post-Deployment Steps

## ✅ Backend Deployment Complete!

Your backend is now successfully deployed on Railway. Here's what to do next:

## Step 1: Get Your Backend URL

1. Go to Railway → Your Backend Service → **Settings** tab
2. Scroll down to **"Public Domain"** or **"Generate Domain"**
3. Click **"Generate Domain"** to get a public URL (e.g., `https://your-backend.railway.app`)
4. **Copy this URL** - you'll need it for the frontend

## Step 2: Test Your Backend

### Test Health Endpoint

Open your browser or use curl:

```bash
# Replace with your actual Railway URL
curl https://your-backend.railway.app/api/health
```

Expected response:
```json
{
  "success": true,
  "message": "API is running",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

### Check Railway Logs

1. Go to Railway → Your Service → **Deployments** tab
2. Click **"View logs"** on the active deployment
3. Verify:
   - ✅ Database connection successful
   - ✅ Environment validation passed
   - ✅ No errors in logs
   - ✅ Server started on port 8080

## Step 3: Verify Database Connection

Check the logs for:
- ✅ "Database connection successful"
- ✅ "Tables created/verified successfully"
- ✅ No MySQL connection errors

If you see database errors:
1. Verify MySQL service is running in Railway
2. Check that all MySQL environment variables are set correctly
3. Verify `MYSQL_SSL=true` and `MYSQL_SSL_REJECT_UNAUTHORIZED=false`

## Step 4: Create Superadmin Account (Optional)

If you need to create a superadmin account, you can:

1. **Option A: Use Railway CLI** (if you have access)
   ```bash
   railway run node scripts/utilities.js create-superadmin
   ```

2. **Option B: Use the API** (after frontend is deployed)
   - Go to `/superadmin/login`
   - Use default credentials (if configured)
   - Or create via API endpoint

## Step 5: Deploy Frontend

### Update Frontend Environment Variables

1. In your frontend project, update `.env.local` or `.env.production`:

```env
NEXT_PUBLIC_API_URL=https://your-backend.railway.app
```

Replace `https://your-backend.railway.app` with your actual Railway backend URL.

### Deploy Frontend to Railway

1. Create a new Railway service for the frontend
2. Connect to your GitHub repository
3. Set **Root Directory** to `frontend`
4. Add environment variable:
   - `NEXT_PUBLIC_API_URL` = your backend Railway URL
5. Deploy!

## Step 6: Test Full Application

After frontend is deployed:

1. ✅ Test public pages (home, about, etc.)
2. ✅ Test user registration/login
3. ✅ Test admin login
4. ✅ Test superadmin login
5. ✅ Verify API calls are working
6. ✅ Check CORS is configured correctly

## Step 7: Configure CORS (If Needed)

If you get CORS errors, update your backend `FRONTEND_URL` variable in Railway:

1. Go to Railway → Backend Service → **Variables** tab
2. Update `FRONTEND_URL` to your frontend Railway URL:
   ```
   FRONTEND_URL=https://your-frontend.railway.app
   ```
3. Redeploy backend (or it will auto-redeploy)

## Step 8: Set Up Custom Domain (Optional)

1. Go to Railway → Your Service → **Settings** tab
2. Scroll to **"Custom Domain"**
3. Add your domain
4. Update DNS records as instructed
5. Update `FRONTEND_URL` and `NEXT_PUBLIC_API_URL` with your custom domain

## Troubleshooting

### Backend Not Responding

1. Check Railway logs for errors
2. Verify all environment variables are set
3. Check database connection in logs
4. Verify port is set correctly (default: 8080)

### CORS Errors

1. Verify `FRONTEND_URL` is set correctly in backend
2. Check CORS configuration in `backend/app.js`
3. Ensure frontend URL matches exactly (including https://)

### Database Connection Errors

1. Verify MySQL service is running
2. Check MySQL environment variables
3. Verify SSL settings: `MYSQL_SSL=true` and `MYSQL_SSL_REJECT_UNAUTHORIZED=false`
4. Check Railway logs for specific MySQL errors

## Next Steps Summary

1. ✅ **Get backend URL** from Railway
2. ✅ **Test health endpoint** (`/api/health`)
3. ✅ **Check logs** for errors
4. ✅ **Update frontend** environment variables
5. ✅ **Deploy frontend** to Railway
6. ✅ **Test full application**
7. ✅ **Configure CORS** if needed
8. ✅ **Set up custom domain** (optional)

## 🎉 You're Done!

Your backend is live and ready to serve your frontend application!

