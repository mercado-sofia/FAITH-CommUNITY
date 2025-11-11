# Vercel Deployment Guide

## Connecting Frontend to Backend

### Step 1: Get Your Backend URL

1. Go to your Railway dashboard
2. Find your backend service
3. Copy the public URL (e.g., `https://your-backend.railway.app`)

### Step 2: Set Environment Variables in Vercel

1. Go to your Vercel project dashboard
2. Navigate to **Settings** → **Environment Variables**
3. Add the following variable:

   **Variable Name:** `NEXT_PUBLIC_API_URL`  
   **Value:** `https://faith-community-testing3.up.railway.app`  
   **Environment:** Select all (Production, Preview, Development)

4. Click **Save**
5. **Important:** Redeploy your application after adding the variable

### Step 3: Update Backend CORS Settings

In your Railway backend environment variables, update:

```
ALLOWED_ORIGINS=https://your-frontend.vercel.app
```

If you have multiple Vercel preview URLs, include them:
```
ALLOWED_ORIGINS=https://your-frontend.vercel.app,https://your-frontend-git-main.vercel.app,https://your-frontend-git-*.vercel.app
```

### Step 4: Update Backend FRONTEND_URL

In Railway, set:
```
FRONTEND_URL=https://your-frontend.vercel.app
```

This is used for email links and redirects.

## Verification

After deployment:

1. **Check Frontend:** Visit `https://your-frontend.vercel.app`
2. **Check API Connection:** Open browser console and verify no CORS errors
3. **Test API:** Try logging in or accessing public endpoints
4. **Check Backend Health:** Visit `https://faith-community-testing3.up.railway.app/api/health`

## Troubleshooting

### CORS Errors
- Verify `ALLOWED_ORIGINS` in Railway includes your exact Vercel URL
- Check that the URL matches exactly (including `https://`)
- Ensure no trailing slashes

### API Connection Failed
- Verify `NEXT_PUBLIC_API_URL` is set correctly in Vercel
- Check that the backend URL is accessible (visit it in browser)
- Ensure backend is running (check Railway logs)
- Redeploy frontend after adding environment variables

### Environment Variable Not Working
- **Important:** `NEXT_PUBLIC_*` variables must be set at build time
- After adding/updating, you MUST redeploy
- Variables are embedded during build, not at runtime

## Quick Checklist

- [ ] Backend deployed on Railway
- [ ] Backend URL copied
- [ ] `NEXT_PUBLIC_API_URL` set in Vercel
- [ ] Vercel project redeployed
- [ ] `ALLOWED_ORIGINS` updated in Railway
- [ ] `FRONTEND_URL` updated in Railway
- [ ] Frontend loads without errors
- [ ] API calls work (check browser console)

