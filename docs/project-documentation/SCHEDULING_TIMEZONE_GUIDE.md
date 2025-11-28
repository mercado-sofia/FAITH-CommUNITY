# Scheduling & Timezone Guide

## Overview

This comprehensive guide covers the scheduling and timezone implementation for scheduled news publishing in the FAITH CommUNITY platform. It includes the strategy, implementation details, debugging steps, and troubleshooting.

---

## Table of Contents

1. [Timezone Strategy](#timezone-strategy)
2. [Implementation Details](#implementation-details)
3. [Complete Flow](#complete-flow)
4. [Debugging Guide](#debugging-guide)
5. [Common Issues & Solutions](#common-issues--solutions)
6. [Testing Checklist](#testing-checklist)

---

## Timezone Strategy

### Core Principles

1. **Store Everything in UTC**
   - All scheduled times are stored in UTC (Coordinated Universal Time) in the database
   - UTC is timezone-agnostic and eliminates ambiguity
   - Makes comparisons and calculations consistent
   - Works correctly across different server timezones

2. **Database Storage**
   - **Field Type**: `DATETIME` (timezone-naive)
   - **Storage Format**: `YYYY-MM-DD HH:mm:ss` (MySQL DATETIME format)
   - **Interpretation**: Always treated as UTC, even though DATETIME doesn't store timezone info

   **Why DATETIME instead of TIMESTAMP?**
   - DATETIME is timezone-naive, giving us full control over timezone interpretation
   - TIMESTAMP in MySQL automatically converts to/from server timezone, which can cause issues
   - We explicitly treat DATETIME values as UTC, avoiding automatic conversions

3. **Conversion Flow**
   ```
   User Input (Local Time) → Convert to UTC → Store in Database (UTC)
                                                    ↓
   Database (UTC) → Convert to User's Local Time → Display to User
   ```

---

## Implementation Details

### Frontend (User Input)

1. **User selects time**: User picks a date/time in their local timezone (e.g., "1:45 PM" in PST)
2. **Get timezone offset**: Browser calculates timezone offset (e.g., "-08:00" for PST)
3. **Send to backend**: Frontend sends both:
   - `publishedAt`: "2025-11-27T13:45:00" (local time, no timezone)
   - `timezoneOffset`: "-08:00" (timezone offset)

**Key Functions:**
- `getBrowserTimezoneOffset()`: Gets browser's timezone offset in "+HH:MM" format
- `validateTimezoneOffset()`: Validates timezone offset format

### Backend (Storage)

1. **Receive local time**: Backend receives user's local time and timezone offset
2. **Convert to UTC**: Uses `convertLocalToUTC()` to convert to UTC
   - Example: "2025-11-27T13:45:00" with "-08:00" → "2025-11-27T21:45:00" UTC
3. **Format for database**: Uses `formatUTCDateForDatabase()` to format as MySQL DATETIME
   - Example: "2025-11-27 21:45:00"
4. **Store in database**: Stores UTC time in `published_at` field

**Key Functions:**
- `convertLocalToUTC(localDateTime, timezoneOffset)`: Converts local time to UTC
- `formatUTCDateForDatabase(utcDate)`: Formats UTC Date object for MySQL
- `validateTimezoneOffset(offset)`: Validates timezone offset format

### Backend (Auto-Publishing)

1. **Compare UTC to UTC**: Uses `UTC_TIMESTAMP()` in SQL queries
2. **Query**: `TIMESTAMPDIFF(SECOND, published_at, UTC_TIMESTAMP()) >= 0`
3. **Publish when**: Stored UTC time <= Current UTC time

**Key Function:**
- `autoUpdateScheduledNews()`: Automatically publishes scheduled news when UTC time arrives

### Frontend (Display)

1. **Retrieve from database**: Gets UTC time from database (e.g., "2025-11-27 21:45:00")
2. **Convert to local**: Uses `formatDateTime()` which treats DATETIME as UTC and converts to local
   - Example: "2025-11-27 21:45:00" UTC → "November 27, 2025, 1:45 PM" (PST)
3. **Display to user**: Shows time in user's local timezone

**Key Function:**
- `formatDateTime(dateString)`: Converts UTC DATETIME to local time for display

---

## Complete Flow

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
12. **DatePickerPopover detects UTC** and converts to local → Shows **"1:45 PM"** ✅
13. User confirms: `"2025-11-27T13:45"` (local)
14. Backend converts: Local → UTC → Stores correctly ✅

### Key Implementation Details

#### DatePickerPopover.js
- **Before**: Removed 'Z' and parsed as local time (WRONG for UTC timestamps)
- **After**: Detects UTC timestamps, parses as UTC, converts to local automatically

#### formatDateTimeForInput()
- Detects UTC timestamps (with 'Z')
- Converts UTC → Local before returning

#### Backend mapNewsToResponse()
- Converts DATETIME to ISO format with 'Z' (UTC indicator)
- Ensures frontend knows it's UTC

#### Why Other Times Work

- **created_at, updated_at**: These are `TIMESTAMP` fields
  - MySQL automatically handles timezone conversion
  - Backend converts to ISO with 'Z' automatically
  - Frontend displays correctly

- **published_at (scheduled)**: This is a `DATETIME` field
  - We manually store UTC
  - We manually convert to ISO with 'Z'
  - DatePickerPopover now handles the 'Z' correctly ✅

---

## Debugging Guide

### Step 1: Check Browser Console (Frontend)

When you schedule a news item, look for these logs:

```
[CreatePostForm] SCHEDULING SUBMISSION:
  - userSelectedTime: "2025-11-27T13:45" (what user picked)
  - timezoneOffset: "-08:00" (user's timezone)
  - browserTimezone: "America/Los_Angeles"
  - browserOffsetMinutes: 480 (PST is UTC-8 = 480 minutes)
```

**What to check:**
- ✅ `userSelectedTime` should match what you see in the date picker
- ✅ `timezoneOffset` should be correct for your timezone
- ✅ `browserOffsetMinutes` should match your timezone (PST = 480, EST = 300, etc.)

### Step 2: Check Server Logs (Backend)

When the backend receives the request, look for:

```
[createNews] SCHEDULING INPUT:
  - receivedLocalTime: "2025-11-27T13:45"
  - receivedTimezoneOffset: "-08:00"
```

Then:

```
[convertLocalToUTC] LOCAL → UTC CONVERSION:
  - inputLocalTime: "2025-11-27T13:45"
  - inputTimezoneOffset: "-08:00"
  - isoStringWithOffset: "2025-11-27T13:45-08:00"
  - convertedUTC: "2025-11-27T21:45:00.000Z"
  - utcComponents: { hour: 21, minute: 45 }
```

**What to check:**
- ✅ `isoStringWithOffset` should be: `localTime + timezoneOffset`
- ✅ `convertedUTC` should be: local time + offset hours
  - Example: 13:45 PST (UTC-8) → 21:45 UTC (13 + 8 = 21)

Then:

```
[createNews] SCHEDULING CONVERSION:
  - inputLocalTime: "2025-11-27T13:45"
  - inputTimezoneOffset: "-08:00"
  - convertedUTCDate: "2025-11-27T21:45:00.000Z"
  - storedInDatabase: "2025-11-27 21:45:00"
```

**What to check:**
- ✅ `storedInDatabase` should match `convertedUTC` (without milliseconds)

### Step 3: Check Display Conversion (Frontend)

When displaying scheduled time, look for:

```
[formatDateTimeForInput] UTC → LOCAL CONVERSION:
  - inputUTC: "2025-11-27T21:45:00.000Z"
  - outputLocal: "2025-11-27T13:45"
  - utcComponents: { hour: 21, minute: 45 }
  - localComponents: { hour: 13, minute: 45 }
```

**What to check:**
- ✅ `outputLocal` should match what user originally picked
- ✅ `localComponents.hour` should be UTC hour minus offset
  - Example: 21:45 UTC → 13:45 PST (21 - 8 = 13)

---

## Common Issues & Solutions

### Issue 1: Timezone Offset is Wrong

**Symptom:** Conversion shows wrong offset

**Check:** `getBrowserTimezoneOffset()` calculation

**Fix:** Verify `-new Date().getTimezoneOffset()` is correct

### Issue 2: Double Conversion

**Symptom:** Time is off by double the offset

**Check:** Look for multiple conversion logs

**Fix:** Ensure conversion happens only once

### Issue 3: Wrong Format

**Symptom:** Parsing errors in logs

**Check:** Format of `publishedAt` string

**Fix:** Should be `"YYYY-MM-DDTHH:mm"` (no seconds, no timezone)

### Issue 4: Database Storage Wrong

**Symptom:** Stored time doesn't match converted UTC

**Check:** `storedInDatabase` vs `convertedUTC`

**Fix:** Verify `formatUTCDateForDatabase()` uses UTC methods

### Issue 5: DatePickerPopover Shows Wrong Time

**Symptom:** When editing, picker shows UTC time instead of local time

**Root Cause:** DatePickerPopover was removing 'Z' and parsing as local time

**Fix:** DatePickerPopover now detects UTC timestamps and converts to local automatically

---

## Common Pitfalls and Solutions

### ❌ Pitfall 1: Storing Local Time Directly

**Problem**: Storing user's local time without conversion
- User in PST schedules for "1:45 PM"
- Stored as "2025-11-27 13:45:00"
- Server in UTC compares with UTC_TIMESTAMP()
- Mismatch: 13:45 UTC ≠ 13:45 PST

**Solution**: Always convert to UTC before storing

### ❌ Pitfall 2: Using Server Timezone

**Problem**: Assuming server timezone matches user timezone
- Server in UTC, user in PST
- User schedules for "1:45 PM" (PST)
- If treated as UTC, publishes 8 hours early

**Solution**: Always use timezone offset from frontend

### ❌ Pitfall 3: Using NOW() Instead of UTC_TIMESTAMP()

**Problem**: Comparing UTC stored time with server timezone
```sql
-- WRONG
WHERE published_at <= NOW()

-- CORRECT
WHERE published_at <= UTC_TIMESTAMP()
```

**Solution**: Always use `UTC_TIMESTAMP()` for comparisons

### ❌ Pitfall 4: Not Handling DST Transitions

**Problem**: Daylight Saving Time can change timezone offsets
- PST: UTC-8 (winter) or UTC-7 (summer)
- User's offset changes twice a year

**Solution**: Always get current timezone offset from browser (handles DST automatically)

---

## Testing Checklist

- [ ] Create new scheduled news - check all logs
- [ ] Edit scheduled news - verify picker shows correct time
- [ ] Check database - verify stored time is UTC
- [ ] Check display - verify shows correct local time
- [ ] Test different timezones - PST, EST, UTC
- [ ] Test edge cases - midnight, DST transitions
- [ ] Verify auto-publishing happens at correct UTC time
- [ ] Test immediate publish still works correctly
- [ ] Test date display on public news pages

---

## Utility Functions Reference

### Backend (`backend/src/utils/dateUtils.js`)

- `validateTimezoneOffset(offset)`: Validates timezone offset format
- `convertLocalToUTC(localDateTime, timezoneOffset)`: Converts local time to UTC
- `formatUTCDateForDatabase(utcDate)`: Formats UTC Date for MySQL DATETIME
- `parseDatabaseDateTimeAsUTC(datetimeString)`: Parses DATETIME as UTC

### Frontend (`frontend/src/utils/shared/dateUtils.js`)

- `getBrowserTimezoneOffset()`: Gets browser's timezone offset
- `validateTimezoneOffset(offset)`: Validates timezone offset format
- `convertLocalToUTC(localDateTime, timezoneOffset)`: Converts local time to UTC
- `formatDateTime(dateString)`: Formats UTC DATETIME to local time for display

---

## Next Steps (If Issues Persist)

If logs show correct conversion but time still doesn't match:

1. Check database directly: `SELECT published_at FROM news WHERE id = ?`
2. Verify database timezone: `SELECT @@global.time_zone, @@session.time_zone`
3. Check if there are multiple conversions happening
4. Verify DatePickerPopover is using the correct value
5. Check for any middleware or interceptors modifying dates

---

## References

- [MDN: Date.getTimezoneOffset()](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date/getTimezoneOffset)
- [MySQL DATETIME vs TIMESTAMP](https://dev.mysql.com/doc/refman/8.0/en/datetime.html)
- [UTC Time Standard](https://en.wikipedia.org/wiki/Coordinated_Universal_Time)

