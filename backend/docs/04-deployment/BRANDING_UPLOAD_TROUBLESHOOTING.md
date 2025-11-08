# Branding Upload Troubleshooting Guide

## Issue: "Failed to upload logo. Please try again."

This guide helps you diagnose and fix branding upload issues after deploying to Railway + Vercel.

## Common Causes

### 1. CORS Configuration Issue (Most Common)

**Symptoms:**
- Error message: "Failed to upload logo. Please try again."
- Browser console shows CORS errors
- Network tab shows status 0 or CORS errors

**Solution:**

1. **Check Backend CORS Configuration (Railway)**
   - Go to Railway → Your Backend Service → Variables
   - Verify `ALLOWED_ORIGINS` includes your Vercel frontend URL
   - Format: `https://your-app.vercel.app` (no trailing slash)
   - Multiple origins: `https://app1.vercel.app,https://app2.vercel.app`

2. **Verify Frontend URL (Vercel)**
   - Go to Vercel → Your Project → Settings → Environment Variables
   - Check `NEXT_PUBLIC_API_URL` is set to your Railway backend URL
   - Format: `https://your-backend.railway.app` (no trailing slash)

3. **Update CORS in Railway:**
   ```env
   ALLOWED_ORIGINS=https://your-frontend.vercel.app
   ```

4. **Redeploy Backend** after updating CORS configuration

### 2. Cloudinary Configuration Missing

**Symptoms:**
- Upload fails with 500 error
- Backend logs show "Cloudinary connection failed"
- Error message mentions Cloudinary

**Solution:**

1. **Check Cloudinary Environment Variables in Railway:**
   ```env
   CLOUDINARY_CLOUD_NAME=your-cloud-name
   CLOUDINARY_API_KEY=your-api-key
   CLOUDINARY_API_SECRET=your-api-secret
   ```

2. **Verify Cloudinary Account:**
   - Log in to [Cloudinary Dashboard](https://cloudinary.com/console)
   - Verify your credentials are correct
   - Check if your account is active

3. **Test Cloudinary Connection:**
   - Check Railway logs for Cloudinary connection errors
   - Look for "Cloudinary connection failed" messages

### 3. Environment Variable Issues

**Symptoms:**
- Upload fails silently
- Backend logs show undefined values
- Error messages mention missing configuration

**Solution:**

1. **Backend Environment Variables (Railway):**
   ```env
   # Required
   CLOUDINARY_CLOUD_NAME=your-cloud-name
   CLOUDINARY_API_KEY=your-api-key
   CLOUDINARY_API_SECRET=your-api-secret
   ALLOWED_ORIGINS=https://your-frontend.vercel.app
   NODE_ENV=production
   ```

2. **Frontend Environment Variables (Vercel):**
   ```env
   NEXT_PUBLIC_API_URL=https://your-backend.railway.app
   ```

3. **Verify Variables:**
   - Check for typos in variable names
   - Ensure no extra spaces or quotes
   - Verify URLs don't have trailing slashes

### 4. Network/Connection Issues

**Symptoms:**
- Error: "Network error: Cannot connect to backend"
- Timeout errors
- Status 0 in network tab

**Solution:**

1. **Verify Backend is Running:**
   - Check Railway logs for errors
   - Verify backend health endpoint: `https://your-backend.railway.app/api/health`
   - Ensure backend service is not paused

2. **Check Backend URL:**
   - Verify `NEXT_PUBLIC_API_URL` in Vercel matches your Railway backend URL
   - Test backend URL in browser: `https://your-backend.railway.app/api/health`

3. **Check Railway Service Status:**
   - Go to Railway → Your Service
   - Verify service is "Active" and not "Paused"
   - Check deployment logs for errors

### 5. Authentication Issues

**Symptoms:**
- Error: "Authentication expired" or "Authentication required"
- 401 status code
- Token validation errors

**Solution:**

1. **Check Token Storage:**
   - Verify `superAdminToken` is stored in localStorage
   - Check browser console for token errors
   - Try logging out and logging back in

2. **Verify JWT Configuration:**
   - Check Railway environment variables:
     ```env
     JWT_SECRET=your-strong-secret-minimum-32-chars
     JWT_ISS=faith-community-api
     JWT_AUD=faith-community-client
     ```

## Step-by-Step Diagnosis

### Step 1: Check Browser Console

1. Open browser DevTools (F12)
2. Go to Console tab
3. Try uploading a logo
4. Look for error messages:
   - CORS errors
   - Network errors
   - Authentication errors

### Step 2: Check Network Tab

1. Open browser DevTools (F12)
2. Go to Network tab
3. Try uploading a logo
4. Find the upload request (`/api/superadmin/branding/upload-logo`)
5. Check:
   - **Status**: Should be 200 (success) or specific error code
   - **Headers**: Check if CORS headers are present
   - **Response**: Check error message in response body

### Step 3: Check Railway Logs

1. Go to Railway → Your Backend Service → Logs
2. Try uploading a logo
3. Look for:
   - Cloudinary errors
   - Authentication errors
   - File upload errors
   - Database errors

### Step 4: Check Vercel Logs

1. Go to Vercel → Your Project → Logs
2. Look for:
   - Environment variable issues
   - API URL configuration errors

## Quick Fixes

### Fix 1: Update CORS Configuration

**In Railway (Backend):**
```env
ALLOWED_ORIGINS=https://your-frontend.vercel.app
```

**Important:** 
- Use exact Vercel URL (no trailing slash)
- Include `https://` protocol
- Redeploy backend after updating

### Fix 2: Verify Environment Variables

**Check Railway Variables:**
- [ ] `CLOUDINARY_CLOUD_NAME` is set
- [ ] `CLOUDINARY_API_KEY` is set
- [ ] `CLOUDINARY_API_SECRET` is set
- [ ] `ALLOWED_ORIGINS` includes your Vercel URL

**Check Vercel Variables:**
- [ ] `NEXT_PUBLIC_API_URL` is set to Railway backend URL
- [ ] No trailing slashes in URLs

### Fix 3: Test Backend Health

1. Open: `https://your-backend.railway.app/api/health`
2. Should return: `{"status":"ok"}`
3. If not, check Railway logs for errors

### Fix 4: Test Cloudinary Connection

1. Check Railway logs for Cloudinary errors
2. Verify Cloudinary credentials in Railway
3. Test Cloudinary connection from Cloudinary dashboard

## Verification Checklist

After applying fixes, verify:

- [ ] Backend health endpoint responds: `https://your-backend.railway.app/api/health`
- [ ] CORS headers present in response (check Network tab)
- [ ] Cloudinary credentials are set in Railway
- [ ] `NEXT_PUBLIC_API_URL` is set correctly in Vercel
- [ ] `ALLOWED_ORIGINS` includes Vercel URL in Railway
- [ ] Browser console shows no CORS errors
- [ ] Network tab shows successful upload (status 200)
- [ ] Logo appears in branding settings after upload

## Still Having Issues?

1. **Check Railway Logs:**
   - Go to Railway → Your Service → Logs
   - Look for specific error messages
   - Check for Cloudinary, CORS, or authentication errors

2. **Check Browser Console:**
   - Open DevTools → Console
   - Look for detailed error messages
   - Check Network tab for request/response details

3. **Verify Configuration:**
   - Double-check all environment variables
   - Verify URLs are correct (no typos, no trailing slashes)
   - Ensure backend is running and accessible

4. **Test Locally:**
   - Try uploading locally with production environment variables
   - This helps identify configuration issues

## Common Error Messages

| Error Message | Cause | Solution |
|--------------|-------|----------|
| "Failed to upload logo. Please try again." | Generic error - check console | See detailed error in browser console |
| "CORS error: Unable to connect to backend" | CORS not configured | Update `ALLOWED_ORIGINS` in Railway |
| "Network error: Cannot connect to backend" | Backend URL incorrect or backend down | Verify `NEXT_PUBLIC_API_URL` and backend status |
| "Authentication expired" | Token invalid or expired | Log out and log back in |
| "Cloudinary connection failed" | Cloudinary credentials missing or incorrect | Verify Cloudinary env vars in Railway |

## Additional Resources

- [Railway Deployment Guide](./RAILWAY_DEPLOYMENT.md)
- [Railway Environment Checklist](./RAILWAY_ENV_CHECKLIST.md)
- [Railway Troubleshooting](./RAILWAY_TROUBLESHOOTING.md)

