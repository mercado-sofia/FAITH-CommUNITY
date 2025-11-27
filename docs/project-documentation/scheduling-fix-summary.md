# Scheduling Time Fix - Complete Solution

## Root Cause Found

The issue was in **DatePickerPopover.js** - when editing scheduled news, the backend returns `published_at` as UTC (e.g., `"2025-11-27T21:45:00.000Z"`), but the DatePickerPopover was:
1. Removing the 'Z' suffix
2. Parsing `"2025-11-27T21:45:00"` as if it were **local time**
3. Displaying UTC time (21:45) as if it were local time

**Result**: User sees 9:45 PM in picker instead of 1:45 PM (their local time).

## The Fix

Updated `DatePickerPopover.parseValue()` to:
1. **Detect UTC timestamps** (ends with 'Z' or has timezone offset)
2. **Parse as UTC** using `new Date(utcString)` - JavaScript automatically converts to local
3. **Return local time** for display in the picker

## Complete Flow (Now Correct)

### Creating Scheduled News
1. User picks: **"1:45 PM"** (local time, PST UTC-8)
2. DatePickerPopover returns: `"2025-11-27T13:45"` (local, no timezone)
3. Frontend sends: `publishedAt: "2025-11-27T13:45"` + `timezoneOffset: "-08:00"`
4. Backend converts: `"2025-11-27T13:45-08:00"` → UTC `"2025-11-27T21:45:00.000Z"`
5. Backend stores: `"2025-11-27 21:45:00"` (UTC in DATETIME field)
6. Backend returns: `"2025-11-27T21:45:00.000Z"` (UTC, ISO format)

### Displaying Scheduled News
7. Frontend receives: `"2025-11-27T21:45:00.000Z"` (UTC)
8. `formatDateTime()` converts: UTC → Local → Shows **"1:45 PM"** ✅

### Editing Scheduled News
9. Frontend receives: `"2025-11-27T21:45:00.000Z"` (UTC)
10. `formatDateTimeForInput()` converts: UTC → Local → Returns `"2025-11-27T13:45"`
11. DatePickerPopover receives: `"2025-11-27T13:45"` (local) OR `"2025-11-27T21:45:00.000Z"` (UTC)
12. **DatePickerPopover now detects UTC** and converts to local → Shows **"1:45 PM"** ✅
13. User confirms: `"2025-11-27T13:45"` (local)
14. Backend converts: Local → UTC → Stores correctly ✅

## Key Changes

### 1. DatePickerPopover.js
- **Before**: Removed 'Z' and parsed as local time (WRONG for UTC timestamps)
- **After**: Detects UTC timestamps, parses as UTC, converts to local automatically

### 2. formatDateTimeForInput() (Already Fixed)
- Detects UTC timestamps (with 'Z')
- Converts UTC → Local before returning

### 3. Backend mapNewsToResponse()
- Converts DATETIME to ISO format with 'Z' (UTC indicator)
- Ensures frontend knows it's UTC

## Why Other Times Work

- **created_at, updated_at**: These are `TIMESTAMP` fields
  - MySQL automatically handles timezone conversion
  - Backend converts to ISO with 'Z' automatically
  - Frontend displays correctly

- **published_at (scheduled)**: This is a `DATETIME` field
  - We manually store UTC
  - We manually convert to ISO with 'Z'
  - **DatePickerPopover was not handling the 'Z' correctly** ← This was the bug

## Testing

1. **Create scheduled news**: Pick "1:45 PM" → Should store as UTC correctly
2. **View scheduled news**: Should display "1:45 PM" (your local time)
3. **Edit scheduled news**: Picker should show "1:45 PM" (not "9:45 PM")
4. **Save changes**: Should maintain correct time

## Verification

Check the logs to verify:
- Frontend sends local time + offset
- Backend converts to UTC correctly
- Backend returns UTC with 'Z'
- Frontend converts UTC to local for display
- DatePickerPopover handles UTC correctly

