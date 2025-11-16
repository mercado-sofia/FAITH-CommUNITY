import mysql from 'mysql2/promise';
import bcrypt from 'bcrypt';

const dbConfig = {
  host: process.env.MYSQL_HOST || 'localhost',
  port: process.env.MYSQL_PORT || 3306,
  user: process.env.MYSQL_USER || 'root',
  password: process.env.MYSQL_PASSWORD || '',
  database: process.env.MYSQL_DATABASE || 'db_community'
};

async function debugSuperadminLogin() {
  const connection = await mysql.createConnection(dbConfig);
  
  try {
    console.log('Debugging superadmin login...\n');
    
    const testEmail = 'faithcommunityfaces@gmail.com';
    const testPassword = 'admin123';
    
    // Test the exact query from loginSuperadmin
    console.log('1. Testing exact query from loginSuperadmin:');
    const [superadminRows] = await connection.execute(
      "SELECT id, email, password_hash as password, twofa_enabled, twofa_secret, created_at, updated_at FROM users WHERE email = ? AND role = 'superadmin'",
      [testEmail]
    );
    
    console.log(`   Found ${superadminRows.length} superadmin(s)`);
    
    if (superadminRows.length === 0) {
      console.log('\n❌ PROBLEM: No superadmin found with that email!');
      console.log('\nChecking for similar emails...');
      
      const [allSuperadmins] = await connection.query(
        "SELECT id, email, role FROM users WHERE role = 'superadmin'"
      );
      
      if (allSuperadmins.length > 0) {
        console.log('Found superadmin(s) with different email:');
        allSuperadmins.forEach(sa => {
          console.log(`  - ID: ${sa.id}, Email: "${sa.email}"`);
          console.log(`    Email match: ${sa.email === testEmail}`);
          console.log(`    Email lowercase match: ${sa.email.toLowerCase() === testEmail.toLowerCase()}`);
        });
      }
      return;
    }
    
    const superadmin = superadminRows[0];
    console.log('   ✅ Superadmin found');
    console.log(`   - ID: ${superadmin.id}`);
    console.log(`   - Email: "${superadmin.email}"`);
    console.log(`   - Email exact match: ${superadmin.email === testEmail}`);
    console.log(`   - Has password_hash: ${superadmin.password ? 'Yes' : 'No'}`);
    
    if (!superadmin.password) {
      console.log('\n❌ PROBLEM: password_hash is NULL or empty!');
      return;
    }
    
    // Test password comparison
    console.log('\n2. Testing password comparison:');
    console.log(`   Testing password: "${testPassword}"`);
    console.log(`   Password hash length: ${superadmin.password.length}`);
    console.log(`   Password hash starts with: ${superadmin.password.substring(0, 7)}`);
    
    try {
      const isPasswordValid = await bcrypt.compare(testPassword, superadmin.password);
      console.log(`   Password comparison result: ${isPasswordValid ? '✅ VALID' : '❌ INVALID'}`);
      
      if (!isPasswordValid) {
        console.log('\n❌ PROBLEM: Password does not match!');
        console.log('   This could mean:');
        console.log('   - The password in database is different from "admin123"');
        console.log('   - The password was not migrated correctly');
        console.log('   - The password was changed after migration');
        
        // Check old table
        const [oldSuperadmin] = await connection.query(
          'SELECT id, username, password FROM superadmin_old WHERE id = 1'
        );
        
        if (oldSuperadmin.length > 0) {
          console.log('\n   Checking old superadmin table:');
          console.log(`   - Username: "${oldSuperadmin[0].username}"`);
          console.log(`   - Has password: ${oldSuperadmin[0].password ? 'Yes' : 'No'}`);
          
          if (oldSuperadmin[0].password) {
            const oldPasswordMatch = await bcrypt.compare(testPassword, oldSuperadmin[0].password);
            console.log(`   - Old password matches: ${oldPasswordMatch ? 'Yes' : 'No'}`);
          }
        }
      } else {
        console.log('\n✅ Password is valid! Login should work.');
        console.log('\n   If login still fails, check:');
        console.log('   - Backend server logs for actual error');
        console.log('   - Email case sensitivity (should match exactly)');
        console.log('   - Request body format');
      }
    } catch (bcryptError) {
      console.log('❌ Error comparing password:', bcryptError.message);
    }
    
    // Test with different email variations
    console.log('\n3. Testing email variations:');
    const emailVariations = [
      testEmail,
      testEmail.toLowerCase(),
      testEmail.toUpperCase(),
      testEmail.trim(),
      ' ' + testEmail + ' '
    ];
    
    for (const emailVar of emailVariations) {
      const [rows] = await connection.execute(
        "SELECT id, email FROM users WHERE email = ? AND role = 'superadmin'",
        [emailVar]
      );
      console.log(`   "${emailVar}": ${rows.length > 0 ? '✅ Found' : '❌ Not found'}`);
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Code:', error.code);
    process.exit(1);
  } finally {
    await connection.end();
  }
}

debugSuperadminLogin();

