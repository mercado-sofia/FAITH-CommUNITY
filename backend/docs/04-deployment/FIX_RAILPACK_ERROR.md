# Fix "Error creating build plan with Railpack"

## The Problem

Railway is using **Railpack** instead of **Nixpacks**, and Railpack can't detect your Node.js project.

Error: "Error creating build plan with Railpack"

## Solution: Force Railway to Use Nixpacks

### Option 1: Set Builder in Railway Settings (Recommended)

1. Go to Railway → Your Service → **Settings** tab
2. Look for **"Builder"** or **"Build System"** section
3. Change from **"Railpack"** to **"Nixpacks"**
4. Click **Save**
5. Railway will redeploy automatically

### Option 2: Use railway.json (Already Created)

The `railway.json` file specifies `"builder": "NIXPACKS"`, but Railway might not be reading it.

1. Make sure `railway.json` is committed to GitHub:
   ```bash
   git add railway.json
   git commit -m "Add railway.json to force Nixpacks"
   git push
   ```

2. Railway should detect it and use Nixpacks

### Option 3: Delete and Recreate Service

If the above doesn't work:

1. Go to Settings → Delete Service
2. Create new service from GitHub
3. **During creation**, Railway might ask for builder
4. Select **"Nixpacks"** instead of Railpack
5. Set root directory to `backend` immediately

### Option 4: Use Railway CLI to Set Builder

```bash
railway variables set RAILWAY_BUILDER=NIXPACKS
```

Or:

```bash
railway variables set BUILDER=NIXPACKS
```

## Verify Root Directory is Set

I can see from your variables that `RAILWAY_ROOT_DIRECTORY=backend` is set, which is good!

But Railway might still be analyzing the root directory during the build phase.

## Quick Fix Checklist

1. ✅ `RAILWAY_ROOT_DIRECTORY=backend` is set (you have this)
2. ❓ Force Railway to use Nixpacks (try Option 1 above)
3. ✅ Commit `railway.json` to GitHub (if not already)
4. ✅ All environment variables are set (you have this)

## What to Try First

1. **Go to Railway → Service → Settings**
2. **Look for "Builder" or "Build System"**
3. **Change from Railpack to Nixpacks**
4. **Save and redeploy**

If you can't find the Builder setting, try committing and pushing the `railway.json` file to GitHub.

