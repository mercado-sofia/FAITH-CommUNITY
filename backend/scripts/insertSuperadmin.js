import mysql from 'mysql2/promise';
import bcrypt from 'bcrypt';

const dbConfig = {
  host: process.env.MYSQL_HOST || 'localhost',
  port: process.env.MYSQL_PORT || 3306,
  user: process.env.MYSQL_USER || 'root',
  password: process.env.MYSQL_PASSWORD || '',
  database: process.env.MYSQL_DATABASE || 'db_community'
};

async function insertSuperadmin() {
  const connection = await mysql.createConnection(dbConfig);
  
  try {
    console.log('Inserting superadmin account...\n');
    
    const superadminEmail = 'faithcommunityfaces@gmail.com';
    const superadminPassword = 'admin123';
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(superadminPassword, saltRounds);
    
    // Check if superadmin already exists
    const [existing] = await connection.query(
      'SELECT id, email FROM users WHERE role = ? AND email = ?',
      ['superadmin', superadminEmail]
    );
    
    if (existing.length > 0) {
      console.log('⚠️  Superadmin already exists:');
      console.log(`   ID: ${existing[0].id}`);
      console.log(`   Email: ${existing[0].email}`);
      console.log('\nUpdating password...');
      
      // Update password
      await connection.query(
        'UPDATE users SET password_hash = ?, password_changed_at = NOW(), updated_at = NOW() WHERE id = ? AND role = ?',
        [hashedPassword, existing[0].id, 'superadmin']
      );
      
      console.log('✅ Superadmin password updated successfully!');
      console.log(`   Email: ${superadminEmail}`);
      console.log(`   Password: ${superadminPassword}`);
    } else {
      console.log('Creating new superadmin account...');
      
      // Insert new superadmin
      const [result] = await connection.query(
        `INSERT INTO users (
          id, email, password_hash, role, email_verified, is_active, 
          password_changed_at, created_at, updated_at
        ) VALUES (1, ?, ?, 'superadmin', TRUE, TRUE, NOW(), NOW(), NOW())
        ON DUPLICATE KEY UPDATE
          email = VALUES(email),
          password_hash = VALUES(password_hash),
          role = 'superadmin',
          email_verified = TRUE,
          is_active = TRUE,
          password_changed_at = NOW(),
          updated_at = NOW()`,
        [superadminEmail, hashedPassword]
      );
      
      console.log('✅ Superadmin account created/updated successfully!');
      console.log(`   ID: 1`);
      console.log(`   Email: ${superadminEmail}`);
      console.log(`   Password: ${superadminPassword}`);
      console.log(`   Role: superadmin`);
    }
    
    // Verify the account
    const [verify] = await connection.query(
      'SELECT id, email, role, is_active, email_verified FROM users WHERE role = ? AND email = ?',
      ['superadmin', superadminEmail]
    );
    
    console.log('\n' + '='.repeat(60));
    console.log('VERIFICATION:');
    console.log('='.repeat(60));
    console.table(verify);
    
    // Test password
    const [testUser] = await connection.query(
      'SELECT password_hash FROM users WHERE email = ? AND role = ?',
      [superadminEmail, 'superadmin']
    );
    
    if (testUser.length > 0) {
      const isValid = await bcrypt.compare(superadminPassword, testUser[0].password_hash);
      console.log(`\nPassword test: ${isValid ? '✅ Valid' : '❌ Invalid'}`);
    }
    
    console.log('\n✅ Superadmin account is ready for login!');
    
  } catch (error) {
    console.error('❌ Error inserting superadmin:', error.message);
    console.error('Code:', error.code);
    console.error('SQL State:', error.sqlState);
    if (error.sql) {
      console.error('SQL:', error.sql);
    }
    process.exit(1);
  } finally {
    await connection.end();
  }
}

insertSuperadmin();

