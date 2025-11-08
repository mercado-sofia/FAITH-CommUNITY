# Railway Root Directory - Step by Step Guide

## Current Location
You're currently on the **main dashboard** showing your projects. You need to go **inside** your project to find the Root Directory setting.

## Step-by-Step Instructions

### Step 1: Click on Your Project
- On your dashboard, you should see a project card named **"serene-hope"** (or similar)
- **Click on that project card** to open it

### Step 2: Find Your Service
- After clicking the project, you'll see your services
- You should see **1 service** (likely named after your GitHub repo or "web")
- **Click on that service** to open it

### Step 3: Go to Settings
- Once inside the service, look at the top navigation
- You should see tabs like: **Overview**, **Deployments**, **Metrics**, **Logs**, **Settings**
- **Click on the "Settings" tab**

### Step 4: Find Root Directory
- In the Settings page, scroll down
- Look for a section called:
  - **"Root Directory"** OR
  - **"Source"** OR
  - **"Build"** (it might be under Build settings)
- You should see a text field where you can enter the root directory

### Step 5: Set Root Directory
- In the Root Directory field, enter: `backend`
- Make sure it's:
  - Lowercase: `backend`
  - No quotes
  - No leading slash
  - Just the word: `backend`

### Step 6: Save
- Click the **"Save"** or **"Update"** button
- Railway will automatically redeploy

## Visual Path

```
Dashboard (where you are now)
  └── Click "serene-hope" project
      └── Click on your service (the one that's failing)
          └── Click "Settings" tab
              └── Scroll to "Root Directory"
                  └── Enter: backend
                      └── Click Save
```

## What You Should See

After clicking into your service, the Settings tab should show:
- Service name
- Environment variables
- Build settings
- **Root Directory** (this is what you're looking for!)
- Deploy settings
- Other configuration options

## If You Still Can't Find It

### Option 1: Check Different Sections
- Look under **"Build"** section
- Look under **"Deploy"** section
- Look under **"Source"** section
- Scroll all the way down in Settings

### Option 2: Use Railway CLI
If you can't find it in the UI, use the Railway CLI:

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

### Option 3: Delete and Recreate Service
1. Go to Settings
2. Scroll to bottom
3. Click "Delete Service"
4. Create new service from GitHub
5. During creation, Railway might ask for root directory
6. Set it to `backend` at that point

## Alternative: Check Service Settings During Creation

If you delete and recreate:
1. Click "+ New" button
2. Select "GitHub Repo"
3. Choose your repository
4. **During setup**, look for "Root Directory" or "Source Directory"
5. Set it to `backend` before deploying

## Still Need Help?

If you've tried all these steps and still can't find it:
1. Take a screenshot of your Settings page
2. Check Railway's documentation: https://docs.railway.app/develop/root-directory
3. Contact Railway support - the UI might have changed

