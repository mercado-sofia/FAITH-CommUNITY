# Single Superadmin Account Test Script

This test script verifies that the single superadmin account implementation is working correctly.

## Usage

```bash
cd backend
node scripts/test-superadmin-single-account.js
```

## What It Tests

The script runs 8 comprehensive tests:

1. **Database Schema** - Verifies that the `id` column is NOT AUTO_INCREMENT and has DEFAULT 1
2. **CHECK Constraint** - Checks if CHECK constraint exists (MySQL 8.0.16+)
3. **Database Trigger** - Checks if trigger exists (fallback for older MySQL)
4. **Single Account Enforcement** - Verifies only one superadmin account exists with id = 1
5. **Prevent Duplicate** - Attempts to create a second account and verifies it's blocked
6. **Related Table References** - Checks that all related tables reference id = 1:
   - `superadmin_notifications.superadmin_id`
   - `program_post_act_reports.reviewed_by_superadmin_id`
   - `audit_logs.user_id` (for superadmin)
7. **Creation Script Logic** - Verifies the creation script detects existing accounts
8. **Existing Functionality** - Tests that queries and updates still work correctly

## Expected Results

All tests should pass (✅) for a successful implementation:

```
🧪 Single Superadmin Account Implementation Tests
═══════════════════════════════════════════════════
Testing the single superadmin account enforcement...

✅ PASS: Schema: id column is NOT AUTO_INCREMENT
✅ PASS: Schema: id column has DEFAULT 1
✅ PASS: CHECK Constraint: Exists (or warning if using trigger)
✅ PASS: Trigger: Exists (or warning if using CHECK constraint)
✅ PASS: Single Account: Only one account exists
✅ PASS: Single Account: Account has id = 1
✅ PASS: Prevent Duplicate: Insert blocked
✅ PASS: Related Tables: All references point to id = 1
✅ PASS: Creation Script: Detects existing account
✅ PASS: Functionality: All queries work correctly

📊 Test Summary
═══════════════════════════════════════════════════
✅ Passed: 10
❌ Failed: 0
⚠️  Warnings: 0

🎉 All critical tests passed!
✅ Single superadmin account implementation is working correctly.
```

## Troubleshooting

### Test Fails: "Schema: id column is AUTO_INCREMENT"
- **Solution**: Run the backend server to trigger the migration, or manually run the migration

### Test Fails: "Single Account: Found multiple accounts"
- **Solution**: The migration should have cleaned this up. Check the database manually:
  ```sql
  SELECT id, username FROM superadmin;
  ```

### Test Fails: "Prevent Duplicate: Second account was created"
- **Solution**: The CHECK constraint or trigger might not be working. Check:
  ```sql
  -- Check constraint
  SHOW CREATE TABLE superadmin;
  
  -- Check trigger
  SHOW TRIGGERS LIKE 'superadmin';
  ```

### Warnings About Missing Tables
- **Note**: Warnings about missing tables (like `program_post_act_reports`) are normal if those tables don't exist yet. They're not critical for the single superadmin enforcement.

## Running After Implementation

1. **First Time Setup**:
   ```bash
   # Start backend to run migrations
   npm start
   
   # In another terminal, run tests
   node scripts/test-superadmin-single-account.js
   ```

2. **After Changes**:
   ```bash
   # Just run the test script
   node scripts/test-superadmin-single-account.js
   ```

## Integration with CI/CD

The test script exits with:
- **Exit code 0**: All tests passed
- **Exit code 1**: One or more tests failed

This makes it suitable for CI/CD pipelines:

```bash
node scripts/test-superadmin-single-account.js && echo "Tests passed!" || echo "Tests failed!"
```

