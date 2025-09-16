# Login Attempts Configuration

## Overview
The system has two rate limiting mechanisms for login attempts:

1. **Express Rate Limiter** (Middleware level)
2. **Custom Login Attempt Tracker** (Application level)

## Current Configuration

### Express Rate Limiter
- **File**: `backend/app.js`
- **Default**: 10 attempts per 15 minutes
- **Environment Variable**: `RATE_LIMIT_AUTH_MAX`
- **Applied to**: All login endpoints via middleware

### Custom Login Attempt Tracker
- **File**: `backend/back_end/utils/loginAttemptTracker.js`
- **Default**: 5 attempts per 5 minutes
- **Applied to**: Individual login controllers
- **Tracks by**: Email + IP address combination

## Environment Variables

Add these to your `.env` file:

```env
# Express Rate Limiter (should be higher than custom tracker)
RATE_LIMIT_AUTH_MAX=10

# Slow down after this many attempts
SLOWDOWN_AUTH_AFTER=5
```

## How It Works

1. **Express Rate Limiter** blocks requests at the middleware level
2. **Custom Login Attempt Tracker** provides more granular control within the application
3. The Express limiter should have a higher limit to allow the custom tracker to work properly

## Recommended Settings

For a 5-attempt limit:
- `RATE_LIMIT_AUTH_MAX=10` (Express limiter - higher limit)
- Custom tracker: 5 attempts (hardcoded in controllers)

This ensures:
- Express limiter doesn't interfere with custom logic
- Custom tracker enforces the actual 5-attempt limit
- System has a safety net at 10 attempts

## Troubleshooting

If you're getting "Too many failed login attempts" too early:

1. Check if `RATE_LIMIT_AUTH_MAX` is set too low
2. Verify the `login_attempts` table exists in the database
3. Check if multiple systems are being tried in sequence (frontend issue)

## Current Behavior

- **5 failed attempts** → Blocked for 5 minutes
- **Successful login** → Clears failed attempts
- **Rate limit messages** → Properly displayed to users
- **Express limiter** → 10 attempts (safety net)
- **Custom tracker** → 5 attempts (actual enforcement)

## Database Table

The system automatically creates a `login_attempts` table with:
- `id`: Primary key
- `identifier`: Email address
- `ip_address`: Client IP
- `attempt_type`: 'failed' or 'success'
- `created_at`: Timestamp

Old attempts are automatically cleaned up after 5 minutes.
