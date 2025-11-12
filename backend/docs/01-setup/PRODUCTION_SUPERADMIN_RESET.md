# Production Superadmin Reset Guide

## Overview

If you can't access the superadmin account in production, you can use the initialization endpoint to reset it. This endpoint is protected by a secret key to ensure security.

## Prerequisites

1. You need access to your production environment variables
2. You need to know your `JWT_SECRET` or set a `SUPERADMIN_INIT_SECRET` environment variable

## Step 1: Get Your Secret Key

The endpoint uses one of these environment variables as the secret key:
- `SUPERADMIN_INIT_SECRET` (preferred - set this specifically for initialization)
- `JWT_SECRET` (fallback - uses your existing JWT secret)

**Option A: Use JWT_SECRET (if you already have it)**
- Use your existing `JWT_SECRET` value

**Option B: Set SUPERADMIN_INIT_SECRET (recommended)**
- Add `SUPERADMIN_INIT_SECRET` to your production environment variables
- Set it to a strong, unique secret (minimum 32 characters)
- This is more secure as it's separate from your JWT secret

## Step 2: Call the Initialization Endpoint

### Using cURL

```bash
curl -X POST https://your-production-domain.com/api/superadmin/auth/initialize \
  -H "Content-Type: application/json" \
  -d '{
    "secretKey": "your-secret-key-here"
  }'
```

### Using Postman

1. **Method**: POST
2. **URL**: `https://your-production-domain.com/api/superadmin/auth/initialize`
3. **Headers**:
   - `Content-Type: application/json`
4. **Body** (raw JSON):
   ```json
   {
     "secretKey": "your-secret-key-here"
   }
   ```

### Using JavaScript/Fetch

```javascript
fetch('https://your-production-domain.com/api/superadmin/auth/initialize', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    secretKey: 'your-secret-key-here'
  })
})
.then(response => response.json())
.then(data => {
  console.log('Success:', data);
  console.log('Email:', data.email);
  console.log('Password:', data.password);
})
.catch((error) => {
  console.error('Error:', error);
});
```

## Step 3: Expected Response

### Success Response

```json
{
  "success": true,
  "message": "Superadmin account reset successfully",
  "email": "faithcommunityfaces@gmail.com",
  "password": "admin123",
  "warning": "Please change the password after first login!"
}
```

### Error Responses

**Invalid Secret Key:**
```json
{
  "error": "Invalid secret key"
}
```

**Server Configuration Error:**
```json
{
  "error": "Server configuration error: Initialization secret not configured"
}
```

## Step 4: Login with Default Credentials

After successful initialization, use these credentials to log in:

- **Email**: `faithcommunityfaces@gmail.com`
- **Password**: `admin123`
- **Login URL**: `https://your-production-domain.com/login` or `/superadmin/login`

## Step 5: Change Password Immediately

⚠️ **IMPORTANT**: Change the password immediately after first login for security!

1. Log in with the default credentials
2. Go to your profile settings
3. Change the password to a strong, unique password
4. Consider enabling 2FA for additional security

## Security Notes

1. **Secret Key Protection**: 
   - Never commit the secret key to version control
   - Store it securely in your production environment variables
   - Rotate it periodically

2. **Endpoint Security**:
   - The endpoint logs all access attempts (including failed ones)
   - Only use this endpoint when absolutely necessary
   - Consider disabling or restricting access after use

3. **Best Practices**:
   - Set `SUPERADMIN_INIT_SECRET` to a different value than `JWT_SECRET`
   - Use a strong, randomly generated secret (minimum 32 characters)
   - Monitor your logs for unauthorized access attempts

## Troubleshooting

### "Invalid secret key" Error
- Verify you're using the correct secret key
- Check that `SUPERADMIN_INIT_SECRET` or `JWT_SECRET` is set in your production environment
- Ensure there are no extra spaces or characters in the secret key

### "Server configuration error" Error
- Check that either `SUPERADMIN_INIT_SECRET` or `JWT_SECRET` is set in your production environment
- Verify the environment variable is loaded correctly

### Can't Access the Endpoint
- Verify the endpoint URL is correct: `/api/superadmin/auth/initialize`
- Check that your production server is running
- Verify network/firewall settings allow access

## Alternative: Database Direct Access

If you have direct database access, you can also run SQL directly:

```sql
-- Reset superadmin password (you'll need to hash 'admin123' with bcrypt)
-- This is more complex and requires bcrypt hashing, so using the API endpoint is recommended
```

However, using the API endpoint is recommended as it:
- Properly hashes the password
- Updates all necessary fields
- Logs the action for audit purposes
- Is easier and safer

## Support

If you continue to have issues:
1. Check your production logs for detailed error messages
2. Verify all environment variables are set correctly
3. Ensure your database connection is working
4. Contact your system administrator if needed

