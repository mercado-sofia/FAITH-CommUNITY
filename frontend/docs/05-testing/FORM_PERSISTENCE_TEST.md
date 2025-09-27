# Form Persistence Test Guide

## Expected Behavior

The FAITH CommUNITY volunteer application form now implements smart persistence that follows these rules:

### ✅ Data Persists When:
1. **Page Refresh within Apply Section**: If user refreshes the page while on `/apply` or any sub-page, form data is preserved
2. **Navigation within Apply Section**: Moving between apply pages (e.g., `/apply` to `/apply?program=123`) preserves data

### ❌ Data Clears When:
1. **Navigation Away from Apply Section**: Moving to any page outside `/apply` (e.g., `/`, `/about`, `/contact`) clears form data
2. **Successful Form Submission**: After successful submission, form data is cleared
3. **Already Applied**: If user already applied for the program, form data is cleared

## Test Scenarios

### Test 1: Page Refresh Persistence
1. Go to `/apply`
2. Fill out the form (select program, enter reason)
3. Refresh the page (F5 or Ctrl+R)
4. **Expected**: Form data should be restored

### Test 2: Navigation Away Clears Data
1. Go to `/apply`
2. Fill out the form
3. Navigate to home page (`/`)
4. Return to `/apply`
5. **Expected**: Form should be empty (fresh start)

### Test 3: Navigation Within Apply Section
1. Go to `/apply`
2. Fill out the form
3. Navigate to `/apply?program=123` (if such URL exists)
4. **Expected**: Form data should be preserved

### Test 4: Successful Submission
1. Fill out and submit the form successfully
2. **Expected**: Form should be cleared after success modal

## Technical Implementation

- Uses `useApplyFormPersistence` custom hook
- Detects page refresh vs navigation using `performance.navigation.type`
- Monitors pathname changes to detect navigation away from apply section
- Automatically clears localStorage when leaving apply section
- Only saves meaningful form data (not empty values)

## Console Logs

The implementation includes console logs for debugging:
- "Form data restored from page refresh"
- "Form data cleared on initial navigation to apply section"
- "Form data saved"
- "Form data cleared - navigated away from apply section"
- "Form data manually cleared"
