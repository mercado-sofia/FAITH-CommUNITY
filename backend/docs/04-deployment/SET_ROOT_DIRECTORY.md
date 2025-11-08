# How to Set Root Directory to `backend` in Railway

## Method 1: Railway CLI (Easiest & Most Reliable)

### Step 1: Install Railway CLI

Open your terminal/command prompt and run:

```bash
npm install -g @railway/cli
```

Or use npx (no installation needed):

```bash
npx @railway/cli
```

### Step 2: Login to Railway

```bash
railway login
```

This will open your browser to authenticate. Click "Authorize" in the browser.

### Step 3: Navigate to Your Backend Directory

```bash
cd backend
```

Make sure you're in the `backend` folder (where `package.json` is located).

### Step 4: Link to Your Railway Project

```bash
railway link
```

You'll see a list of your Railway projects. Select the one you want to use.

### Step 5: Set Root Directory

Set the root directory variable:

```bash
railway variables set RAILWAY_ROOT_DIRECTORY=backend
```

Or try this alternative:

```bash
railway variables set ROOT_DIRECTORY=backend
```

### Step 6: Verify It Worked

Check if the variable was set:

```bash
railway variables
```

You should see `RAILWAY_ROOT_DIRECTORY` or `ROOT_DIRECTORY` in the list.

### Step 7: Trigger Redeploy

Go back to Railway dashboard and trigger a redeploy, or run:

```bash
railway up
```

---

## Method 2: Railway Dashboard (If Available)

### Step 1: Go to Your Service

1. Click on your backend service in Railway
2. Go to **Settings** tab

### Step 2: Find Root Directory

Look for one of these sections:
- **"Root Directory"** section
- **"Source"** section
- **"Build"** section → "Source Directory"
- **"Deploy"** section → "Working Directory"

### Step 3: Set Root Directory

1. Find the text field for Root Directory
2. Enter: `backend` (no quotes, no slash)
3. Click **Save** or **Update**

### Step 4: Railway Will Redeploy

Railway will automatically trigger a new deployment.

---

## Method 3: Using railway.json (Already Created)

I've already created a `railway.json` file in your root directory with the root directory specified.

### Step 1: Commit and Push

```bash
git add railway.json
git commit -m "Add railway.json with root directory"
git push
```

### Step 2: Railway Will Auto-Detect

Railway should automatically detect the `railway.json` file and use the root directory setting.

### Step 3: Check Deployment

Go to Railway dashboard and check if the deployment works.

---

## Method 4: Delete and Recreate Service

If nothing else works:

### Step 1: Delete Current Service

1. Go to your backend service → Settings
2. Scroll to bottom
3. Click **"Delete Service"**

### Step 2: Create New Service

1. Click **"+ New"** in Railway
2. Select **"GitHub Repo"**
3. Choose your repository

### Step 3: During Setup

During the service creation, Railway might ask:
- **"Root Directory"** or
- **"Source Directory"** or
- **"Working Directory"**

Enter: `backend`

### Step 4: Complete Setup

Finish creating the service and Railway will deploy.

---

## Which Method Should You Use?

**Recommended Order:**

1. **Try Method 1 (Railway CLI)** - Most reliable
2. **Try Method 3 (railway.json)** - Already created, just push to GitHub
3. **Try Method 2 (Dashboard)** - If you can find the setting
4. **Use Method 4 (Recreate)** - Last resort

---

## Verify It Worked

After setting the root directory, check the deployment logs. You should see:

✅ **Success:**
```
✓ Detected Node.js project
✓ Installing dependencies...
✓ npm install
✓ Starting application...
```

❌ **Still Failing:**
```
✖ Railpack could not determine how to build the app
```

If it's still failing, try a different method or check the troubleshooting guide.

---

## Quick CLI Commands Summary

```bash
# Install CLI
npm install -g @railway/cli

# Login
railway login

# Navigate to backend
cd backend

# Link to project
railway link

# Set root directory
railway variables set RAILWAY_ROOT_DIRECTORY=backend

# Verify
railway variables

# Redeploy
railway up
```

---

## Need Help?

If none of these methods work:
1. Check Railway's documentation: https://docs.railway.app/develop/root-directory
2. Contact Railway support
3. Check the troubleshooting guide: `RAILWAY_TROUBLESHOOTING.md`

