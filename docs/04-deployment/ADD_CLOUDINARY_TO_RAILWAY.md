# How to Add Cloudinary Credentials to Railway

## Quick Steps

### Step 1: Get Your Cloudinary Credentials

1. Go to [Cloudinary Dashboard](https://cloudinary.com/console)
2. Log in to your account
3. Go to **Dashboard** (you'll see your credentials at the top)
4. Copy these three values:
   - **Cloud Name** (e.g., `djty9l7zw`)
   - **API Key** (e.g., `123456789012345`)
   - **API Secret** (e.g., `abcdefghijklmnopqrstuvwxyz123456`)

### Step 2: Add to Railway

1. Go to [Railway Dashboard](https://railway.app)
2. Select your **backend service** (not the MySQL service)
3. Click on the **Variables** tab
4. Click **+ New Variable** for each of these:

#### Add These 3 Variables:

**Variable 1:**
- **Name:** `CLOUDINARY_CLOUD_NAME`
- **Value:** Your Cloudinary Cloud Name (from Step 1)

**Variable 2:**
- **Name:** `CLOUDINARY_API_KEY`
- **Value:** Your Cloudinary API Key (from Step 1)

**Variable 3:**
- **Name:** `CLOUDINARY_API_SECRET`
- **Value:** Your Cloudinary API Secret (from Step 1)

### Step 3: Redeploy

After adding the variables:
1. Railway will automatically redeploy your service
2. Wait for deployment to complete (check the Deployments tab)
3. Verify deployment is successful (green checkmark)

### Step 4: Test

1. Go to your Vercel frontend
2. Navigate to Superadmin → Settings → Branding
3. Try uploading a logo
4. It should work now! ✅

## Important Notes

- **No quotes needed:** Don't wrap the values in quotes
- **No spaces:** Make sure there are no extra spaces before/after values
- **Case sensitive:** Variable names are case-sensitive (use exact names above)
- **Keep secret:** Never share your API Secret publicly

## Optional: AWS S3 (Only if you use Post Act Reports)

If you also want to use AWS S3 for Post Act Reports, add these variables:

**Variable 4:**
- **Name:** `AWS_REGION`
- **Value:** `ap-northeast-1` (or your preferred region)

**Variable 5:**
- **Name:** `AWS_ACCESS_KEY_ID`
- **Value:** Your AWS Access Key ID

**Variable 6:**
- **Name:** `AWS_SECRET_ACCESS_KEY`
- **Value:** Your AWS Secret Access Key

**Variable 7:**
- **Name:** `AWS_S3_BUCKET_NAME`
- **Value:** Your S3 bucket name (e.g., `faith-community-files`)

**Note:** AWS S3 is **optional** - only needed if you use Post Act Report uploads. Branding uploads use Cloudinary only.

## Verification

After adding variables, check Railway logs:
1. Go to Railway → Your Service → Logs
2. Look for: "Cloudinary connection failed" (should NOT appear)
3. If you see Cloudinary errors, double-check your credentials

## Troubleshooting

### "Cloudinary connection failed"
- Verify all 3 variables are set correctly
- Check for typos in variable names
- Ensure no extra spaces in values
- Verify credentials in Cloudinary dashboard

### "Failed to upload logo"
- Check Railway logs for specific error
- Verify Cloudinary account is active
- Check if you've exceeded Cloudinary free tier limits

## Example

Your Railway Variables tab should look like this:

```
CLOUDINARY_CLOUD_NAME     djty9l7zw
CLOUDINARY_API_KEY        123456789012345
CLOUDINARY_API_SECRET     abcdefghijklmnopqrstuvwxyz123456
```

## Next Steps

After adding Cloudinary credentials:
1. ✅ Branding uploads (logo, favicon, logo name) will work
2. ✅ Profile photo uploads will work
3. ✅ Program image uploads will work
4. ✅ Highlight uploads will work
5. ✅ News image uploads will work

All file uploads in your app use Cloudinary, so this is essential!

