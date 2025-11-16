import mysql from 'mysql2/promise';

const dbConfig = {
  host: process.env.MYSQL_HOST || 'localhost',
  port: process.env.MYSQL_PORT || 3306,
  user: process.env.MYSQL_USER || 'root',
  password: process.env.MYSQL_PASSWORD || '',
  database: process.env.MYSQL_DATABASE || 'db_community'
};

async function checkSuperadmin() {
  const connection = await mysql.createConnection(dbConfig);
  
  try {
    console.log('Checking superadmin data...\n');
    
    // Check superadmin in users table
    const [superadmin] = await connection.query(
      'SELECT id, email, role, is_active, email_verified, password_hash IS NOT NULL as has_password, twofa_enabled FROM users WHERE role = ?',
      ['superadmin']
    );
    
    console.log('='.repeat(60));
    console.log('SUPERADMIN DATA IN USERS TABLE');
    console.log('='.repeat(60));
    
    if (superadmin.length === 0) {
      console.log('❌ No superadmin found in users table!');
      console.log('\nChecking old superadmin table...');
      
      const [oldSuperadmin] = await connection.query(
        'SELECT * FROM superadmin_old LIMIT 1'
      );
      
      if (oldSuperadmin.length > 0) {
        console.log('⚠️  Found superadmin in old table:');
        console.table(oldSuperadmin);
        console.log('\n⚠️  Migration may have failed for superadmin!');
      } else {
        console.log('❌ No superadmin found in old table either!');
      }
    } else {
      console.log(`✅ Found ${superadmin.length} superadmin(s):`);
      console.table(superadmin);
      
      // Test the exact login query
      const testEmail = superadmin[0].email;
      console.log(`\nTesting login query with email: ${testEmail}`);
      
      const [testResult] = await connection.execute(
        "SELECT id, email, password_hash as password, twofa_enabled, twofa_secret, created_at, updated_at FROM users WHERE email = ? AND role = 'superadmin'",
        [testEmail]
      );
      
      if (testResult.length > 0) {
        console.log('✅ Login query works!');
        console.log('Query result:');
        console.log('- ID:', testResult[0].id);
        console.log('- Email:', testResult[0].email);
        console.log('- Has password:', testResult[0].password ? 'Yes' : 'No');
        console.log('- 2FA enabled:', testResult[0].twofa_enabled);
      } else {
        console.log('❌ Login query returned no results!');
      }
    }
    
  } catch (error) {
    console.error('❌ Error checking superadmin:', error.message);
    console.error('Code:', error.code);
    process.exit(1);
  } finally {
    await connection.end();
  }
}

checkSuperadmin();

