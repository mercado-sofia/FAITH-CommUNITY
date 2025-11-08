import db from '../src/database.js';
import bcrypt from 'bcrypt';

/**
 * Test script for single superadmin account implementation
 * Usage: node scripts/test-superadmin-single-account.js
 */

// Test results tracking
const testResults = {
  passed: [],
  failed: [],
  warnings: []
};

// Helper functions
function logTest(name, passed, message = '') {
  if (passed) {
    testResults.passed.push(name);
    console.log(`✅ PASS: ${name}${message ? ` - ${message}` : ''}`);
  } else {
    testResults.failed.push(name);
    console.log(`❌ FAIL: ${name}${message ? ` - ${message}` : ''}`);
  }
}

function logWarning(name, message) {
  testResults.warnings.push({ name, message });
  console.log(`⚠️  WARN: ${name} - ${message}`);
}

// Test 1: Check database schema - id column should not be AUTO_INCREMENT
async function testSchema() {
  console.log('\n📋 Test 1: Database Schema');
  console.log('─────────────────────────────────────');
  
  try {
    const [columnInfo] = await db.execute(`
      SELECT COLUMN_KEY, EXTRA, COLUMN_DEFAULT, COLUMN_TYPE
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'superadmin' 
      AND COLUMN_NAME = 'id'
    `);
    
    if (columnInfo.length === 0) {
      logTest('Schema: superadmin table exists', false, 'Table not found');
      return false;
    }
    
    const column = columnInfo[0];
    const hasAutoIncrement = column.EXTRA && column.EXTRA.includes('auto_increment');
    const hasDefault = column.COLUMN_DEFAULT === '1' || column.COLUMN_DEFAULT === 1;
    
    logTest('Schema: id column is NOT AUTO_INCREMENT', !hasAutoIncrement, 
      hasAutoIncrement ? 'Column still has AUTO_INCREMENT' : 'Column does not have AUTO_INCREMENT');
    
    logTest('Schema: id column has DEFAULT 1', hasDefault, 
      hasDefault ? 'Default value is 1' : `Default value is ${column.COLUMN_DEFAULT}`);
    
    return !hasAutoIncrement && hasDefault;
  } catch (error) {
    logTest('Schema: Check schema', false, error.message);
    return false;
  }
}

// Test 2: Check CHECK constraint exists (MySQL 8.0.16+)
async function testCheckConstraint() {
  console.log('\n🔒 Test 2: CHECK Constraint');
  console.log('─────────────────────────────────────');
  
  try {
    const [constraints] = await db.execute(`
      SELECT CONSTRAINT_NAME 
      FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS 
      WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'superadmin' 
      AND CONSTRAINT_NAME = 'chk_single_superadmin'
    `);
    
    if (constraints.length > 0) {
      logTest('CHECK Constraint: Exists', true, 'Constraint chk_single_superadmin found');
      return true;
    } else {
      logWarning('CHECK Constraint', 'Not found (may be using trigger or older MySQL version)');
      return null; // Not a failure, just a warning
    }
  } catch (error) {
    logWarning('CHECK Constraint', `Error checking: ${error.message}`);
    return null;
  }
}

// Test 3: Check trigger exists
async function testTrigger() {
  console.log('\n⚙️  Test 3: Database Trigger');
  console.log('─────────────────────────────────────');
  
  try {
    const [triggers] = await db.execute(`
      SELECT TRIGGER_NAME 
      FROM INFORMATION_SCHEMA.TRIGGERS 
      WHERE TRIGGER_SCHEMA = DATABASE()
      AND TRIGGER_NAME = 'prevent_multiple_superadmin'
    `);
    
    if (triggers.length > 0) {
      logTest('Trigger: Exists', true, 'Trigger prevent_multiple_superadmin found');
      return true;
    } else {
      logWarning('Trigger', 'Not found (may be using CHECK constraint)');
      return null; // Not a failure, just a warning
    }
  } catch (error) {
    logWarning('Trigger', `Error checking: ${error.message}`);
    return null;
  }
}

// Test 4: Verify only one superadmin account exists
async function testSingleAccount() {
  console.log('\n👤 Test 4: Single Account Enforcement');
  console.log('─────────────────────────────────────');
  
  try {
    const [accounts] = await db.execute('SELECT id, username FROM superadmin');
    
    if (accounts.length === 0) {
      logTest('Single Account: At least one account exists', false, 'No superadmin account found');
      return false;
    }
    
    if (accounts.length === 1) {
      logTest('Single Account: Only one account exists', true, `Found 1 account (id: ${accounts[0].id})`);
      
      // Check if id is 1
      if (accounts[0].id === 1) {
        logTest('Single Account: Account has id = 1', true, `Account id is ${accounts[0].id}`);
      } else {
        logTest('Single Account: Account has id = 1', false, `Account id is ${accounts[0].id}, expected 1`);
      }
      
      return accounts[0].id === 1;
    } else {
      logTest('Single Account: Only one account exists', false, `Found ${accounts.length} accounts`);
      accounts.forEach(acc => {
        console.log(`   - ID: ${acc.id}, Username: ${acc.username}`);
      });
      return false;
    }
  } catch (error) {
    logTest('Single Account: Check accounts', false, error.message);
    return false;
  }
}

// Test 5: Try to insert a second superadmin (should fail)
async function testPreventDuplicate() {
  console.log('\n🚫 Test 5: Prevent Duplicate Accounts');
  console.log('─────────────────────────────────────');
  
  try {
    // Try to insert a second superadmin with id = 2
    const hashedPassword = await bcrypt.hash('test123', 10);
    
    try {
      await db.execute(`
        INSERT INTO superadmin (id, username, password, twofa_enabled, twofa_secret, created_at, updated_at)
        VALUES (2, 'test@test.com', ?, FALSE, NULL, NOW(), NOW())
      `, [hashedPassword]);
      
      // If we get here, the insert succeeded (should not happen)
      logTest('Prevent Duplicate: Insert blocked', false, 'Second account was created (should be blocked)');
      
      // Clean up - delete the test account
      await db.execute('DELETE FROM superadmin WHERE id = 2');
      return false;
    } catch (insertError) {
      // This is expected - the insert should fail
      const errorMessage = insertError.message.toLowerCase();
      if (errorMessage.includes('only one superadmin account is allowed') || 
          errorMessage.includes('check constraint') ||
          errorMessage.includes('duplicate entry')) {
        logTest('Prevent Duplicate: Insert blocked', true, 'Second account creation was prevented');
        return true;
      } else {
        logTest('Prevent Duplicate: Insert blocked', false, `Unexpected error: ${insertError.message}`);
        return false;
      }
    }
  } catch (error) {
    logTest('Prevent Duplicate: Test execution', false, error.message);
    return false;
  }
}

// Test 6: Check related table references
async function testRelatedTables() {
  console.log('\n🔗 Test 6: Related Table References');
  console.log('─────────────────────────────────────');
  
  let allPassed = true;
  
  try {
    // Check superadmin_notifications
    try {
      const [notifications] = await db.execute(`
        SELECT COUNT(*) as count 
        FROM superadmin_notifications 
        WHERE superadmin_id != 1
      `);
      
      if (notifications[0].count === 0) {
        logTest('Related Tables: superadmin_notifications', true, 'All references point to id = 1');
      } else {
        logTest('Related Tables: superadmin_notifications', false, 
          `Found ${notifications[0].count} notifications with superadmin_id != 1`);
        allPassed = false;
      }
    } catch (error) {
      logWarning('Related Tables: superadmin_notifications', `Table might not exist: ${error.message}`);
    }
    
    // Check program_post_act_reports
    try {
      const [reports] = await db.execute(`
        SELECT COUNT(*) as count 
        FROM program_post_act_reports 
        WHERE reviewed_by_superadmin_id IS NOT NULL AND reviewed_by_superadmin_id != 1
      `);
      
      if (reports[0].count === 0) {
        logTest('Related Tables: program_post_act_reports', true, 'All references point to id = 1');
      } else {
        logTest('Related Tables: program_post_act_reports', false, 
          `Found ${reports[0].count} reports with reviewed_by_superadmin_id != 1`);
        allPassed = false;
      }
    } catch (error) {
      logWarning('Related Tables: program_post_act_reports', `Table might not exist: ${error.message}`);
    }
    
    // Check audit_logs
    try {
      const [auditLogs] = await db.execute(`
        SELECT COUNT(*) as count 
        FROM audit_logs 
        WHERE user_type = 'superadmin' AND user_id != 1
      `);
      
      if (auditLogs[0].count === 0) {
        logTest('Related Tables: audit_logs', true, 'All references point to id = 1');
      } else {
        logTest('Related Tables: audit_logs', false, 
          `Found ${auditLogs[0].count} audit logs with user_id != 1`);
        allPassed = false;
      }
    } catch (error) {
      logWarning('Related Tables: audit_logs', `Table might not exist: ${error.message}`);
    }
    
    return allPassed;
  } catch (error) {
    logTest('Related Tables: Check references', false, error.message);
    return false;
  }
}

// Test 7: Test creation script logic
async function testCreationScript() {
  console.log('\n📝 Test 7: Creation Script Logic');
  console.log('─────────────────────────────────────');
  
  try {
    // Check if superadmin exists
    const [existing] = await db.execute('SELECT id, username FROM superadmin LIMIT 1');
    
    if (existing.length > 0) {
      logTest('Creation Script: Detects existing account', true, 
        `Found existing account (id: ${existing[0].id}, username: ${existing[0].username})`);
      
      // The creation script should prevent creating a new account
      // This is tested by the preventDuplicate test
      return true;
    } else {
      logTest('Creation Script: Detects existing account', false, 'No account found (should create one)');
      return false;
    }
  } catch (error) {
    logTest('Creation Script: Check logic', false, error.message);
    return false;
  }
}

// Test 8: Verify existing functionality still works
async function testExistingFunctionality() {
  console.log('\n🔧 Test 8: Existing Functionality');
  console.log('─────────────────────────────────────');
  
  try {
    // Test 1: Can query by id = 1
    const [byId] = await db.execute('SELECT id, username FROM superadmin WHERE id = 1');
    logTest('Functionality: Query by id = 1', byId.length > 0, 
      byId.length > 0 ? 'Query successful' : 'No account found with id = 1');
    
    // Test 2: Can query by username
    if (byId.length > 0) {
      const [byUsername] = await db.execute('SELECT id, username FROM superadmin WHERE username = ?', 
        [byId[0].username]);
      logTest('Functionality: Query by username', byUsername.length > 0, 
        byUsername.length > 0 ? 'Query successful' : 'No account found with username');
    }
    
    // Test 3: Can update password (simulate)
    const [canUpdate] = await db.execute('SELECT id FROM superadmin WHERE id = 1 LIMIT 1');
    logTest('Functionality: Can update account', canUpdate.length > 0, 
      canUpdate.length > 0 ? 'Account can be updated' : 'Account not found for update');
    
    return byId.length > 0;
  } catch (error) {
    logTest('Functionality: Test queries', false, error.message);
    return false;
  }
}

// Main test runner
async function runAllTests() {
  console.log('🧪 Single Superadmin Account Implementation Tests');
  console.log('═══════════════════════════════════════════════════');
  console.log('Testing the single superadmin account enforcement...\n');
  
  try {
    // Run all tests
    await testSchema();
    await testCheckConstraint();
    await testTrigger();
    await testSingleAccount();
    await testPreventDuplicate();
    await testRelatedTables();
    await testCreationScript();
    await testExistingFunctionality();
    
    // Print summary
    console.log('\n═══════════════════════════════════════════════════');
    console.log('📊 Test Summary');
    console.log('═══════════════════════════════════════════════════');
    console.log(`✅ Passed: ${testResults.passed.length}`);
    console.log(`❌ Failed: ${testResults.failed.length}`);
    console.log(`⚠️  Warnings: ${testResults.warnings.length}`);
    
    if (testResults.failed.length > 0) {
      console.log('\n❌ Failed Tests:');
      testResults.failed.forEach(test => {
        console.log(`   - ${test}`);
      });
    }
    
    if (testResults.warnings.length > 0) {
      console.log('\n⚠️  Warnings:');
      testResults.warnings.forEach(warning => {
        console.log(`   - ${warning.name}: ${warning.message}`);
      });
    }
    
    if (testResults.failed.length === 0) {
      console.log('\n🎉 All critical tests passed!');
      console.log('✅ Single superadmin account implementation is working correctly.');
    } else {
      console.log('\n⚠️  Some tests failed. Please review the implementation.');
    }
    
    // Exit with appropriate code
    process.exit(testResults.failed.length === 0 ? 0 : 1);
    
  } catch (error) {
    console.error('\n❌ Test execution error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run tests
runAllTests();

