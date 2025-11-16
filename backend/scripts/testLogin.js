import mysql from 'mysql2/promise';

const dbConfig = {
  host: process.env.MYSQL_HOST || 'localhost',
  port: process.env.MYSQL_PORT || 3306,
  user: process.env.MYSQL_USER || 'root',
  password: process.env.MYSQL_PASSWORD || '',
  database: process.env.MYSQL_DATABASE || 'db_community'
};

async function testLoginQuery() {
  const connection = await mysql.createConnection(dbConfig);
  
  try {
    console.log('Testing login query...\n');
    
    // Test the exact query used in loginUser
    const testEmail = 'test@example.com';
    
    const [users] = await connection.query(
      `SELECT u.*, up.first_name, up.last_name, up.contact_number, up.gender, 
              up.address, up.birth_date, up.occupation, up.citizenship, 
              up.profile_photo_url, up.newsletter_subscribed
       FROM users u
       LEFT JOIN user_profiles up ON u.id = up.user_id
       WHERE u.email = ? AND u.role = 'user'`,
      [testEmail]
    );
    
    console.log('✅ Query executed successfully');
    console.log(`Found ${users.length} user(s) with email: ${testEmail}`);
    
    if (users.length > 0) {
      console.log('\nUser data structure:');
      console.log('- id:', users[0].id);
      console.log('- email:', users[0].email);
      console.log('- role:', users[0].role);
      console.log('- password_hash:', users[0].password_hash ? 'exists' : 'missing');
      console.log('- is_active:', users[0].is_active);
      console.log('- email_verified:', users[0].email_verified);
      console.log('- first_name:', users[0].first_name);
      console.log('- last_name:', users[0].last_name);
    }
    
    // Check if users table has the correct structure
    console.log('\n' + '='.repeat(60));
    console.log('Checking users table structure...');
    const [columns] = await connection.query('DESCRIBE users');
    const requiredColumns = ['id', 'email', 'password_hash', 'role', 'is_active', 'email_verified'];
    const existingColumns = columns.map(col => col.Field);
    
    console.log('\nRequired columns:', requiredColumns.join(', '));
    console.log('Existing columns:', existingColumns.join(', '));
    
    const missingColumns = requiredColumns.filter(col => !existingColumns.includes(col));
    if (missingColumns.length > 0) {
      console.log('\n❌ Missing columns:', missingColumns.join(', '));
    } else {
      console.log('\n✅ All required columns exist');
    }
    
    // Check user_profiles table
    console.log('\n' + '='.repeat(60));
    console.log('Checking user_profiles table structure...');
    const [profileColumns] = await connection.query('DESCRIBE user_profiles');
    const profileColumnNames = profileColumns.map(col => col.Field);
    console.log('Profile columns:', profileColumnNames.join(', '));
    
    // Test a sample query with actual data
    console.log('\n' + '='.repeat(60));
    console.log('Checking for existing users...');
    const [allUsers] = await connection.query(
      'SELECT id, email, role, is_active, email_verified FROM users LIMIT 5'
    );
    
    if (allUsers.length > 0) {
      console.log(`\nFound ${allUsers.length} user(s) in database:`);
      allUsers.forEach((user, i) => {
        console.log(`${i + 1}. ID: ${user.id}, Email: ${user.email}, Role: ${user.role}, Active: ${user.is_active}, Verified: ${user.email_verified}`);
      });
    } else {
      console.log('\n⚠️  No users found in database');
    }
    
  } catch (error) {
    console.error('\n❌ Error testing login query:');
    console.error('Code:', error.code);
    console.error('Message:', error.message);
    console.error('SQL State:', error.sqlState);
    if (error.sql) {
      console.error('SQL:', error.sql);
    }
    process.exit(1);
  } finally {
    await connection.end();
  }
}

testLoginQuery();

