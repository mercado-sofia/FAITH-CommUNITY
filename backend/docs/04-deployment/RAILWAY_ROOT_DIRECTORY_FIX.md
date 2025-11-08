# How to Fix Railway Root Directory Issue

## The Problem

Railway is analyzing your repository root directory which contains:
```
./
├── backend/
├── frontend/
└── .gitignore
```

Railway can't determine what to build because there's no `package.json` in the root. It needs to look in the `backend/` directory instead.

## The Solution: Set Root Directory in Railway

### Step-by-Step Instructions

1. **Go to Railway Dashboard**
   - Visit [railway.app](https://railway.app)
   - Log in to your account

2. **Open Your Project**
   - Click on your project name

3. **Select Your Backend Service**
   - Click on the service that's failing (usually named after your repo or "web")

4. **Go to Settings**
   - Click on the **Settings** tab (gear icon or "Settings" link)
   - It's usually in the top navigation or sidebar

5. **Find Root Directory Section**
   - Scroll down in the Settings page
   - Look for a section called **"Root Directory"** or **"Source"**
   - It might be under "Build" or "Deploy" settings

6. **Set Root Directory**
   - In the Root Directory field, enter: `backend`
   - **Important:** 
     - No quotes
     - No leading slash
     - Just the word: `backend`
   - It should look like this: `backend`

7. **Save Changes**
   - Click **Save** or **Update** button
   - Railway will automatically trigger a new deployment

8. **Wait for Redeployment**
   - Railway will automatically redeploy
   - Watch the deployment logs
   - You should now see it detecting Node.js and running `npm install`

## Visual Guide

```
Railway Dashboard
  └── Your Project
      └── Your Service (the one that's failing)
          └── Settings Tab
              └── Scroll down to "Root Directory"
                  └── Enter: backend
                      └── Click Save
```

## What Should Happen After Setting Root Directory

After you set the Root Directory and Railway redeploys, you should see in the logs:

✅ **Before (Current Error):**
```
✖ Railpack could not determine how to build the app.
The app contents that Railpack analyzed contains:
./
├── backend/
├── frontend/
```

✅ **After (What You Should See):**
```
✓ Detected Node.js project
✓ Installing dependencies...
✓ npm install
✓ Starting application...
✓ node app.js
```

## Alternative: If You Can't Find Root Directory Setting

If you can't find the Root Directory setting in Railway:

1. **Delete and Recreate the Service**
   - Go to Settings
   - Click "Delete Service"
   - Create a new service from GitHub
   - **During creation**, Railway might ask for the root directory
   - Set it to `backend` at that point

2. **Use Railway CLI**
   ```bash
   # Install Railway CLI
   npm i -g @railway/cli
   
   # Login
   railway login
   
   # Link to your project
   railway link
   
   # Set root directory
   railway variables set RAILWAY_ROOT_DIRECTORY=backend
   ```

3. **Contact Railway Support**
   - If the setting is not visible, Railway's UI might have changed
   - Contact Railway support for help

## Verification

After setting the root directory, verify it worked:

1. Check the deployment logs
2. Look for: "Detected Node.js" or "Installing dependencies"
3. You should see `npm install` running
4. The build should complete successfully
5. The app should start with `node app.js`

## Still Having Issues?

If you've set the Root Directory but it's still failing:

1. **Double-check the value**
   - Make sure it's exactly `backend` (lowercase, no quotes)
   - Not `/backend` or `./backend` or `backend/`

2. **Check if it saved**
   - Go back to Settings
   - Verify the Root Directory field shows `backend`

3. **Try redeploying manually**
   - Go to Deployments tab
   - Click "Redeploy"

4. **Check Railway documentation**
   - [Railway Root Directory Docs](https://docs.railway.app/develop/root-directory)

## Important Notes

- The Root Directory setting is **required** for monorepos (repos with multiple directories)
- Railway needs to know where your `package.json` is located
- Without this setting, Railway will always look in the repository root
- This is a one-time configuration per service

