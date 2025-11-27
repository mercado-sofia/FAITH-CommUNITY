# Scheduling Time Debug Guide

## Overview
This guide helps debug why scheduled times don't match what users set in the date picker.

## Debugging Steps

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

## Common Issues

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

## Expected Flow

1. **User picks:** "1:45 PM" (PST, UTC-8)
2. **DatePickerPopover returns:** "2025-11-27T13:45"
3. **Frontend sends:** "2025-11-27T13:45" + "-08:00"
4. **Backend converts:** "2025-11-27T13:45-08:00" → "2025-11-27T21:45:00.000Z"
5. **Backend stores:** "2025-11-27 21:45:00" (UTC)
6. **Backend returns:** "2025-11-27T21:45:00.000Z" (UTC)
7. **Frontend converts:** "2025-11-27T21:45:00.000Z" → "2025-11-27T13:45" (local)
8. **DatePickerPopover displays:** "1:45 PM" ✅

## Testing Checklist

- [ ] Create new scheduled news - check all logs
- [ ] Edit scheduled news - verify picker shows correct time
- [ ] Check database - verify stored time is UTC
- [ ] Check display - verify shows correct local time
- [ ] Test different timezones - PST, EST, UTC
- [ ] Test edge cases - midnight, DST transitions

## Next Steps

If logs show correct conversion but time still doesn't match:
1. Check database directly: `SELECT published_at FROM news WHERE id = ?`
2. Verify database timezone: `SELECT @@global.time_zone, @@session.time_zone`
3. Check if there are multiple conversions happening
4. Verify DatePickerPopover is using the correct value

