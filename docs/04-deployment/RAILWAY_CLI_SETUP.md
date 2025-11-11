# Railway CLI - Set Root Directory

If you can't find the Root Directory setting in Railway's UI, use the Railway CLI instead.

## Step 1: Install Railway CLI

Open your terminal/command prompt and run:

```bash
npm install -g @railway/cli
```

Or if you prefer using npx (no installation needed):

```bash
npx @railway/cli
```

## Step 2: Login to Railway

```bash
railway login
```

This will open your browser to authenticate.

## Step 3: Link to Your Project

Navigate to your backend directory:

```bash
cd backend
```

Then link to your Railway project:

```bash
railway link
```

Select your project when prompted.

## Step 4: Set Root Directory

Set the root directory environment variable:

```bash
railway variables set RAILWAY_ROOT_DIRECTORY=backend
```

Or if that doesn't work, try:

```bash
railway variables set ROOT_DIRECTORY=backend
```

## Step 5: Verify

Check if it was set:

```bash
railway variables
```

You should see `RAILWAY_ROOT_DIRECTORY` or `ROOT_DIRECTORY` in the list.

## Step 6: Redeploy

Trigger a new deployment:

```bash
railway up
```

Or go to Railway dashboard and manually trigger a redeploy.

## Alternative: Use railway.json

If CLI doesn't work, we can try using a railway.json in the root with the root directory specified.

