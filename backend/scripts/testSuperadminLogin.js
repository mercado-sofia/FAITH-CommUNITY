import mysql from 'mysql2/promise';
import bcrypt from 'bcrypt';

const dbConfig = {
  host: process.env.MYSQL_HOST || 'localhost',
  port: process.env.MYSQL_PORT || 3306,
  user: process.env.MYSQL_USER || 'root',
  password: process.env.MYSQL_PASSWORD || '',
  database: process.env.MYSQL_DATABASE || 'db_community'
};

async function testSuperadminLogin() {
  const connection = await mysql.createConnection(dbConfig);
  
  try {
    console.log('Testing superadmin login query...\n');
    
    const testEmail = 'faithcommunityfaces@gmail.com';
    const testPassword = 'admin123'; // Default password
    
    // Test the exact query from loginSuperadmin
    const [superadminRows] = await connection.execute(
      "SELECT id, email, password_hash as password, twofa_enabled, twofa_secret, created_at, updated_at FROM users WHERE email = ? AND role = 'superadmin'",
      [testEmail]
    );
    
    console.log('='.repeat(60));
    console.log('SUPERADMIN LOGIN TEST');
    console.log('='.repeat(60));
    
    if (superadminRows.length === 0) {
      console.log('❌ No superadmin found with email:', testEmail);
      return;
    }
    
    const superadmin = superadminRows[0];
    console.log('\n✅ Superadmin found:');
    console.log('- ID:', superadmin.id);
    console.log('- Email:', superadmin.email);
    console.log('- Has password_hash:', superadmin.password ? 'Yes' : 'No');
    console.log('- Password hash length:', superadmin.password ? superadmin.password.length : 0);
    console.log('- Password hash preview:', superadmin.password ? superadmin.password.substring(0, 20) + '...' : 'N/A');
    console.log('- 2FA enabled:', superadmin.twofa_enabled);
    
    if (!superadmin.password) {
      console.log('\n❌ ERROR: password_hash is NULL or empty!');
      console.log('This means the password was not migrated correctly.');
      return;
    }
    
    // Test password comparison
    console.log('\nTesting password comparison...');
    try {
      const isPasswordValid = await bcrypt.compare(testPassword, superadmin.password);
      console.log('- Password comparison result:', isPasswordValid ? '✅ Valid' : '❌ Invalid');
      
      if (!isPasswordValid) {
        console.log('\n⚠️  Password does not match!');
        console.log('The password in the database might be different from "admin123"');
        console.log('Or the password was not migrated correctly from the old table.');
        
        // Check old table
        const [oldSuperadmin] = await connection.query(
          'SELECT id, username, password FROM superadmin_old WHERE id = 1'
        );
        
        if (oldSuperadmin.length > 0) {
          console.log('\nOld superadmin data:');
          console.log('- Username:', oldSuperadmin[0].username);
          console.log('- Has password:', oldSuperadmin[0].password ? 'Yes' : 'No');
        }
      } else {
        console.log('\n✅ Password is valid! Login should work.');
      }
    } catch (bcryptError) {
      console.log('❌ Error comparing password:', bcryptError.message);
    }
    
  } catch (error) {
    console.error('❌ Error testing superadmin login:', error.message);
    console.error('Code:', error.code);
    console.error('SQL State:', error.sqlState);
    process.exit(1);
  } finally {
    await connection.end();
  }
}

testSuperadminLogin();

