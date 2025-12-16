# How to Initialize Superadmin Account

After setting `SUPERADMIN_EMAIL` and `SUPERADMIN_PASSWORD` in Railway environment variables, you need to call the initialization endpoint to update the database.

## Option 1: Using the Helper Script (Easiest)

I've created a helper script for you. Run it from your local machine:

```bash
cd backend
BACKEND_URL=https://your-backend.railway.app JWT_SECRET=your-jwt-secret node scripts/initialize-superadmin.js
```

Replace:
- `https://your-backend.railway.app` with your actual Railway backend URL
- `your-jwt-secret` with your actual JWT_SECRET from Railway variables

## Option 2: Using curl (Terminal/PowerShell)

### Windows PowerShell:
```powershell
$backendUrl = "https://your-backend.railway.app"
$jwtSecret = "your-jwt-secret-here"

Invoke-RestMethod -Uri "$backendUrl/api/superadmin/auth/initialize" `
  -Method POST `
  -ContentType "application/json" `
  -Body (@{secretKey=$jwtSecret} | ConvertTo-Json)
```

### Windows CMD or Git Bash:
```bash
curl -X POST https://your-backend.railway.app/api/superadmin/auth/initialize ^
  -H "Content-Type: application/json" ^
  -d "{\"secretKey\": \"your-jwt-secret-here\"}"
```

### Mac/Linux:
```bash
curl -X POST https://your-backend.railway.app/api/superadmin/auth/initialize \
  -H "Content-Type: application/json" \
  -d '{"secretKey": "your-jwt-secret-here"}'
```

## Option 3: Using Postman or Insomnia

1. **Method:** `POST`
2. **URL:** `https://your-backend.railway.app/api/superadmin/auth/initialize`
3. **Headers:**
   - `Content-Type: application/json`
4. **Body (JSON):**
   ```json
   {
     "secretKey": "your-jwt-secret-here"
   }
   ```

## Option 4: Using Browser Console

Open your browser's developer console (F12) on your deployed frontend and run:

```javascript
fetch('https://your-backend.railway.app/api/superadmin/auth/initialize', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ secretKey: 'your-jwt-secret-here' })
})
.then(r => r.json())
.then(data => {
  console.log('Success!', data);
  console.log('Email:', data.email);
  console.log('Password:', data.password);
})
.catch(err => console.error('Error:', err));
```

## Option 5: Using Railway CLI

If you have Railway CLI installed:

```bash
railway run node scripts/utilities.js create-superadmin
```

## How to Get Your Values

### Get Your Backend URL:
1. Go to Railway dashboard
2. Click on your backend service
3. Go to **Settings** tab
4. Find **"Public Domain"** or **"Generate Domain"**
5. Copy the URL (e.g., `https://your-backend.railway.app`)

### Get Your JWT_SECRET:
1. Go to Railway dashboard
2. Click on your backend service
3. Go to **Variables** tab
4. Find `JWT_SECRET`
5. Copy the value

## Expected Response

If successful, you'll get:

```json
{
  "success": true,
  "message": "Superadmin account reset successfully",
  "email": "your-email@example.com",
  "password": "your-password",
  "warning": "Please change the password after first login!",
  "note": "All failed login attempts have been cleared. You can now log in immediately."
}
```

## After Initialization

Once you get a success response, you can log in with:
- **Email:** The value you set in `SUPERADMIN_EMAIL`
- **Password:** The value you set in `SUPERADMIN_PASSWORD`

## Troubleshooting

### Error: "Invalid secret key"
- Make sure `JWT_SECRET` matches exactly what's in Railway variables
- Check for extra spaces or quotes

### Error: "Connection refused" or "Failed to fetch"
- Verify your backend URL is correct
- Make sure the backend is running (check Railway logs)
- Try accessing `https://your-backend.railway.app/api/health` in a browser

### Error: "Superadmin credentials not configured"
- Make sure `SUPERADMIN_EMAIL` and `SUPERADMIN_PASSWORD` are set in Railway variables
- Redeploy the backend after adding the variables

