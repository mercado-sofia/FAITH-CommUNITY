# Scheduling Time Fix - Complete Redesign

## Problem
Scheduled time doesn't match what user sets in date picker. Multiple conversion points causing confusion.

## Root Cause Analysis

### Current Flow (Too Complex)
1. User picks: "1:45 PM" (local)
2. DatePickerPopover: Returns "2025-11-27T13:45" (local, no timezone)
3. Frontend sends: "2025-11-27T13:45" + "-08:00"
4. Backend converts: Local → UTC → Stores "2025-11-27 21:45:00"
5. Backend returns: Converts to ISO "2025-11-27T21:45:00.000Z"
6. Frontend converts: UTC → Local for display
7. Frontend converts: UTC → Local for picker input

**Problem**: Too many conversion points, potential for errors at each step.

## Solution: Simplified Single-Conversion Flow

### Principle
- **Store**: Always UTC in database
- **Convert**: Only at boundaries (frontend ↔ backend)
- **Display**: Always show user's local time
- **Input**: Always accept user's local time

### New Flow
1. User picks: "1:45 PM" (local) → DatePickerPopover returns "2025-11-27T13:45"
2. Frontend sends: "2025-11-27T13:45" + timezone offset "-08:00"
3. Backend: Converts ONCE using offset → Stores UTC "2025-11-27 21:45:00"
4. Backend returns: UTC as ISO "2025-11-27T21:45:00.000Z"
5. Frontend: Converts ONCE UTC → Local → Shows "1:45 PM" (correct)
6. Frontend: Converts ONCE UTC → Local → Picker shows "1:45 PM" (correct)

## Implementation Plan

### Step 1: Verify Timezone Offset Calculation
- Ensure `getBrowserTimezoneOffset()` returns correct offset
- Test with different timezones

### Step 2: Verify Backend Conversion
- Ensure `convertLocalToUTC()` correctly uses offset
- Add logging to verify conversion

### Step 3: Verify Frontend Display
- Ensure `formatDateTime()` correctly converts UTC → Local
- Ensure `formatDateTimeForInput()` correctly converts UTC → Local

### Step 4: Add Debug Logging
- Log at each conversion point
- Show: Input → Output at each step

### Step 5: Test End-to-End
- Create scheduled news
- Verify stored time in database
- Verify displayed time matches input
- Verify picker shows correct time when editing

