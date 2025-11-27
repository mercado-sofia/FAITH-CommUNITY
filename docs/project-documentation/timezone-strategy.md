# Timezone Strategy for Scheduled News

## Overview

This document explains the timezone handling strategy for scheduled news publishing in the FAITH-CommUNITY application. The system ensures that scheduled news publishes at the correct time regardless of the user's timezone or the server's timezone.

## Core Principles

### 1. **Store Everything in UTC**

All scheduled times are stored in UTC (Coordinated Universal Time) in the database. This is the industry standard approach because:

- UTC is timezone-agnostic
- Eliminates ambiguity about what timezone a datetime represents
- Makes comparisons and calculations consistent
- Works correctly across different server timezones

### 2. **Database Storage**

- **Field Type**: `DATETIME` (timezone-naive)
- **Storage Format**: `YYYY-MM-DD HH:mm:ss` (MySQL DATETIME format)
- **Interpretation**: Always treated as UTC, even though DATETIME doesn't store timezone info

**Why DATETIME instead of TIMESTAMP?**
- DATETIME is timezone-naive, giving us full control over timezone interpretation
- TIMESTAMP in MySQL automatically converts to/from server timezone, which can cause issues
- We explicitly treat DATETIME values as UTC, avoiding automatic conversions

### 3. **Conversion Flow**

```
User Input (Local Time) → Convert to UTC → Store in Database (UTC)
                                                      ↓
Database (UTC) → Convert to User's Local Time → Display to User
```

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

## Code Examples

### Creating Scheduled News

**Frontend:**
```javascript
const timezoneOffset = getBrowserTimezoneOffset(); // e.g., "-08:00"
submitData.publishedAt = "2025-11-27T13:45:00"; // Local time
submitData.timezoneOffset = timezoneOffset;
```

**Backend:**
```javascript
const utcDate = convertLocalToUTC(normalizedPublishedAt, timezoneOffset);
const finalPublishedAt = formatUTCDateForDatabase(utcDate);
// Stores: "2025-11-27 21:45:00" in database
```

### Displaying Scheduled News

**Frontend:**
```javascript
const formatted = formatDateTime(news.published_at);
// Input: "2025-11-27 21:45:00" (UTC)
// Output: "November 27, 2025, 1:45 PM" (local time)
```

### Auto-Publishing

**Backend SQL:**
```sql
UPDATE news 
SET status = 'published' 
WHERE status = 'scheduled' 
AND published_at IS NOT NULL
AND TIMESTAMPDIFF(SECOND, published_at, UTC_TIMESTAMP()) >= 0
```

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

## Testing Considerations

### Test Cases

1. **Different Timezones**
   - PST (UTC-8): Schedule 1:45 PM → Should store 9:45 PM UTC
   - EST (UTC-5): Schedule 1:45 PM → Should store 6:45 PM UTC
   - UTC (UTC+0): Schedule 1:45 PM → Should store 1:45 PM UTC

2. **DST Transitions**
   - Schedule during DST change
   - Verify correct conversion before/after transition

3. **Edge Cases**
   - Midnight (00:00)
   - Year boundaries
   - Invalid timezone offsets

4. **Backward Compatibility**
   - Old scheduled items (created before timezone fix)
   - Items without timezone offset

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

## Migration Notes

- **Existing Data**: Scheduled news created before this fix may be in server timezone
- **Backward Compatibility**: System handles missing timezone offset gracefully
- **No Database Migration**: No schema changes needed (DATETIME field already exists)
- **Gradual Rollout**: New scheduled items use UTC, old items continue to work

## Best Practices

1. **Always validate timezone offset** before using it
2. **Log timezone conversions** in development for debugging
3. **Use centralized utilities** instead of manual calculations
4. **Document timezone assumptions** in code comments
5. **Test with multiple timezones** before deployment
6. **Handle edge cases** (DST, invalid offsets, etc.)

## References

- [MDN: Date.getTimezoneOffset()](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date/getTimezoneOffset)
- [MySQL DATETIME vs TIMESTAMP](https://dev.mysql.com/doc/refman/8.0/en/datetime.html)
- [UTC Time Standard](https://en.wikipedia.org/wiki/Coordinated_Universal_Time)

