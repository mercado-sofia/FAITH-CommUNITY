# Program Preview Persistence Test

## Updated Behavior

The FAITH CommUNITY ProgramPreview component now persists the selected program data using the same persistence logic as the form:

### ✅ Program Preview Persists When:
1. **Page Refresh within Apply Section**: Selected program remains visible after page refresh
2. **Navigation within Apply Section**: Program selection is maintained when moving between apply pages

### ❌ Program Preview Resets When:
1. **Navigation Away from Apply Section**: Moving to any page outside `/apply` clears the selected program
2. **Form Submission**: After successful form submission, the selected program is cleared
3. **Manual Clear**: When form data is manually cleared

## Test Scenarios

### Test 1: Program Preview Persistence on Refresh
1. Go to `/apply`
2. Select a program from the dropdown
3. Verify the ProgramPreview shows the selected program details
4. Refresh the page (F5 or Ctrl+R)
5. **Expected**: ProgramPreview should still show the same selected program

### Test 2: Program Preview Reset on Navigation Away
1. Go to `/apply`
2. Select a program from the dropdown
3. Verify the ProgramPreview shows the selected program details
4. Navigate to home page (`/`)
5. Return to `/apply`
6. **Expected**: ProgramPreview should show "Select a Program" (empty state)

### Test 3: Program Preview Reset on Form Submission
1. Go to `/apply`
2. Select a program and fill out the form
3. Submit the form successfully
4. **Expected**: ProgramPreview should reset to empty state after success

## Technical Implementation

- `ApplyPage` component now uses `useApplyFormPersistence` for `selectedProgram` state
- Uses separate localStorage key: `'apply_selected_program'`
- Same persistence rules apply: refresh = persist, navigate away = clear
- ProgramPreview component automatically receives the persisted data via props

## Console Logs

The implementation includes console logs for debugging:
- "Form data restored from page refresh" (for selected program)
- "Form data cleared - navigated away from apply section" (for selected program)
- "Form data manually cleared" (when form is submitted)

## Data Flow

```
User selects program → setSelectedProgram (persisted) → ProgramPreview receives selectedProgram prop → Displays program details
Page refresh → selectedProgram restored from localStorage → ProgramPreview shows same program
Navigate away → selectedProgram cleared → ProgramPreview shows empty state
```
