# Error Handling Flow Documentation

## Overview
This document describes the organized error handling flow for admin pages to prevent duplicate logging and ensure clean error management.

## Error Flow Architecture

### 1. Fetcher Level (`adminFetcher` / `organizationFetcher`)
**Location:** `frontend/src/app/admin/hooks/useAdminData.js`

**Responsibilities:**
- Make API request
- Handle HTTP response errors
- Parse JSON errors
- Validate response structure
- **Mark errors with `_alreadyLogged = true`** before logging
- Add `status` and `statusText` to error objects
- Throw errors to SWR

**Error Marking Pattern:**
```javascript
const error = new Error(errorMessage);
error.status = response.status;
error.statusText = response.statusText;
error._alreadyLogged = true; // ✅ Mark BEFORE logging
logger.apiError(url, error, { ... });
throw error;
```

### 2. SWR Level (`useSWR` hooks)
**Location:** `frontend/src/app/admin/hooks/useAdminData.js`

**Responsibilities:**
- Receive errors from fetcher
- **Check `_alreadyLogged` flag** before logging in `onError`
- Determine retry logic based on status codes
- Pass errors to components

**Retry Logic Pattern:**
```javascript
shouldRetryOnError: (error) => {
  const status = error?.status || error?.response?.status;
  // If status is undefined, allow retry (might be network error)
  if (status === undefined || status === null) return true;
  // Don't retry on specific error statuses
  return status !== 401 && status !== 404 && status !== 429 && !(status >= 500);
},
onError: (error) => {
  // ✅ Only log if error hasn't been logged already by the fetcher
  if (!error._alreadyLogged && orgAcronym) {
    logger.swrError(endpoint, error, { orgAcronym });
  }
}
```

### 3. Component Level (Page Components)
**Location:** `frontend/src/app/admin/submissions/page.js` (and other pages)

**Responsibilities:**
- Receive errors from SWR hooks
- **Check `_alreadyLogged` flag** before calling `handleApiError`
- Display user-friendly error messages
- Suppress toast notifications for 500 errors during retries

**Component Error Handling Pattern:**
```javascript
useEffect(() => {
  if (error) {
    // ✅ Only log if error hasn't been logged already by the fetcher/SWR
    const shouldLog = !error._alreadyLogged;
    const errorInfo = handleApiError(error, 'submissions_load', {
      redirectOnAuth: true,
      logError: shouldLog
    });
    // Suppress toast for 500 errors during retries
    const errorStatus = error?.status || error?.response?.status;
    if (errorStatus && typeof errorStatus === 'number' && errorStatus >= 500) {
      return; // SWR will handle retries
    }
    if (errorInfo.message) {
      showToast(errorInfo.message, 'error');
    }
  }
}, [error, showToast]);
```

### 4. Error Handler Utility (`handleApiError`)
**Location:** `frontend/src/app/admin/utils/errorHandler.js`

**Responsibilities:**
- Centralized error processing
- **Check `_alreadyLogged` flag** before logging
- Return structured error information
- Handle different error types (401, 403, 404, 429, 500+)

**Error Handler Pattern:**
```javascript
export const handleApiError = (error, context = 'api_call', options = {}) => {
  const { logError = true } = options;
  
  // ✅ Skip logging if error is already logged
  if (error?._alreadyLogged) {
    logError = false;
  }
  
  // Handle errors based on status...
  if (logError && !error._alreadyLogged) {
    logger.apiError(context, error, { status });
  }
  
  return { type, message, action, status };
};
```

### 5. Logger Level (`logger`)
**Location:** `frontend/src/utils/logger.js`

**Responsibilities:**
- Log errors to console (development) or monitoring (production)
- Reduce console noise in production
- Send all errors to monitoring service

**Logger Pattern:**
```javascript
error(message, error = null, context = null) {
  // In production, only log critical errors to console
  if (this.isProduction) {
    const isCritical = !context?.type || 
                      context.type === 'component_error' || 
                      context.type === 'server_error' ||
                      (context.type === 'api_error' && error?.status >= 500);
    if (isCritical) {
      console.error(`[ERROR] ${message}`, errorData);
    }
    // Always send to monitoring service
    this.sendToMonitoringService('error', message, errorData);
  }
}
```

## Error Flow Diagram

```
API Request
    ↓
[Fetcher] adminFetcher/organizationFetcher
    ├─ HTTP Error (401, 403, 404, 500+)
    │   ├─ Mark: error._alreadyLogged = true
    │   ├─ Log: logger.apiError()
    │   └─ Throw error
    ├─ JSON Parse Error
    │   ├─ Mark: error._alreadyLogged = true
    │   ├─ Log: logger.apiError()
    │   └─ Throw error
    └─ Network/Other Error
        ├─ Check: !error._alreadyLogged
        ├─ Mark: error._alreadyLogged = true
        ├─ Log: logger.apiError() (if not already logged)
        └─ Throw error
    ↓
[SWR] useSWR hook
    ├─ Receive error from fetcher
    ├─ Check: !error._alreadyLogged
    ├─ Log: logger.swrError() (if not already logged)
    ├─ Retry Logic: shouldRetryOnError()
    │   ├─ Don't retry: 401, 404, 429, 500+
    │   └─ Retry: Other errors (including undefined status)
    └─ Pass error to component
    ↓
[Component] Page Component
    ├─ Receive error from SWR
    ├─ Check: !error._alreadyLogged
    ├─ Process: handleApiError(error, { logError: shouldLog })
    ├─ Suppress toast for 500 errors during retries
    └─ Display: showToast() for user-facing errors
    ↓
[Error Handler] handleApiError()
    ├─ Check: error._alreadyLogged
    ├─ Set: logError = false (if already logged)
    ├─ Log: logger.apiError() (if logError && !_alreadyLogged)
    └─ Return: { type, message, action, status }
    ↓
[Logger] logger.error()
    ├─ Production: Only log critical errors to console
    └─ Always: Send to monitoring service
```

## Key Principles

### 1. Single Source of Truth for Logging
- **Fetcher logs first** and marks `_alreadyLogged = true`
- All subsequent handlers check this flag before logging
- Prevents duplicate logs in console

### 2. Status Code Propagation
- Fetcher adds `error.status` and `error.statusText`
- All handlers use: `error?.status || error?.response?.status`
- Retry logic respects status codes

### 3. Retry Strategy
- **Don't retry:** 401 (auth), 404 (not found), 429 (rate limit), 500+ (server errors)
- **Do retry:** Other errors, including undefined status (network errors)
- Consistent across all SWR hooks

### 4. User Experience
- Suppress toast notifications for 500 errors during retries
- Show toast for client errors (4xx) immediately
- Server errors visible in UI state after retries exhausted

### 5. Production vs Development
- **Development:** All errors logged to console
- **Production:** Only critical errors logged to console
- **Both:** All errors sent to monitoring service

## Consistency Checklist

✅ All fetchers mark errors with `_alreadyLogged = true` before logging
✅ All SWR `onError` callbacks check `_alreadyLogged` before logging
✅ All components check `_alreadyLogged` before calling `handleApiError`
✅ All `shouldRetryOnError` functions have consistent logic
✅ All status code checks use safe access: `error?.status || error?.response?.status`
✅ All retry logic handles undefined/null status codes
✅ Error handler respects `_alreadyLogged` flag
✅ Logger reduces console noise in production

## Files Modified

1. `frontend/src/app/admin/hooks/useAdminData.js`
   - ✅ `adminFetcher`: Consistent error marking and logging
   - ✅ `organizationFetcher`: Matches `adminFetcher` pattern
   - ✅ All 10 SWR hooks: Consistent `onError` and `shouldRetryOnError`

2. `frontend/src/app/admin/submissions/page.js`
   - ✅ Error handling respects `_alreadyLogged` flag
   - ✅ Suppresses toast for 500 errors during retries

3. `frontend/src/app/admin/utils/errorHandler.js`
   - ✅ Checks `_alreadyLogged` flag throughout
   - ✅ Prevents duplicate logging

4. `frontend/src/utils/logger.js`
   - ✅ Reduces console noise in production
   - ✅ Recognizes `server_error` type
   - ✅ Still sends all errors to monitoring

## Testing Checklist

- [ ] Verify no duplicate error logs in console
- [ ] Verify 500 errors don't spam console in production
- [ ] Verify retry logic works correctly
- [ ] Verify toast notifications appear for 4xx errors
- [ ] Verify toast notifications suppressed for 500 errors during retries
- [ ] Verify error status codes propagate correctly
- [ ] Verify network errors (undefined status) are retried
- [ ] Verify all errors are sent to monitoring service

