import mysql from 'mysql2/promise';

const dbConfig = {
  host: process.env.MYSQL_HOST || 'localhost',
  port: process.env.MYSQL_PORT || 3306,
  user: process.env.MYSQL_USER || 'root',
  password: process.env.MYSQL_PASSWORD || '',
  database: process.env.MYSQL_DATABASE || 'db_community'
};

async function verifySchema() {
  const connection = await mysql.createConnection(dbConfig);
  
  try {
    console.log('='.repeat(60));
    console.log('VERIFYING USERS TABLE SCHEMA');
    console.log('='.repeat(60));
    
    const [usersColumns] = await connection.query('DESCRIBE users');
    const [usersIndexes] = await connection.query('SHOW INDEXES FROM users');
    const [usersConstraints] = await connection.query(`
      SELECT CONSTRAINT_NAME, CONSTRAINT_TYPE 
      FROM information_schema.TABLE_CONSTRAINTS 
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'users'
    `, [dbConfig.database]);
    
    console.log('\n✅ USERS TABLE COLUMNS:');
    console.table(usersColumns);
    
    console.log('\n✅ USERS TABLE INDEXES:');
    const uniqueIndexes = usersIndexes.filter(idx => idx.Non_unique === 0 && idx.Key_name !== 'PRIMARY');
    const regularIndexes = usersIndexes.filter(idx => idx.Non_unique === 1);
    console.log('Unique Indexes:', uniqueIndexes.map(idx => idx.Column_name).join(', '));
    console.log('Regular Indexes:', regularIndexes.map(idx => idx.Column_name).join(', '));
    
    console.log('\n✅ USERS TABLE CONSTRAINTS:');
    console.table(usersConstraints);
    
    console.log('\n' + '='.repeat(60));
    console.log('VERIFYING USER_PROFILES TABLE SCHEMA');
    console.log('='.repeat(60));
    
    const [profilesColumns] = await connection.query('DESCRIBE user_profiles');
    const [profilesIndexes] = await connection.query('SHOW INDEXES FROM user_profiles');
    const [profilesConstraints] = await connection.query(`
      SELECT CONSTRAINT_NAME, CONSTRAINT_TYPE 
      FROM information_schema.TABLE_CONSTRAINTS 
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'user_profiles'
    `, [dbConfig.database]);
    
    console.log('\n✅ USER_PROFILES TABLE COLUMNS:');
    console.table(profilesColumns);
    
    console.log('\n✅ USER_PROFILES TABLE INDEXES:');
    console.log('Indexes:', profilesIndexes.map(idx => idx.Column_name).join(', '));
    
    console.log('\n✅ USER_PROFILES TABLE CONSTRAINTS:');
    console.table(profilesConstraints);
    
    // Verify foreign key relationship
    const [fkInfo] = await connection.query(`
      SELECT 
        CONSTRAINT_NAME,
        COLUMN_NAME,
        REFERENCED_TABLE_NAME,
        REFERENCED_COLUMN_NAME
      FROM information_schema.KEY_COLUMN_USAGE
      WHERE TABLE_SCHEMA = ? 
      AND TABLE_NAME = 'user_profiles'
      AND REFERENCED_TABLE_NAME IS NOT NULL
    `, [dbConfig.database]);
    
    console.log('\n✅ FOREIGN KEY RELATIONSHIPS:');
    console.table(fkInfo);
    
    console.log('\n' + '='.repeat(60));
    console.log('✅ SCHEMA VERIFICATION COMPLETE');
    console.log('='.repeat(60));
    
  } catch (error) {
    console.error('❌ Error verifying schema:', error.message);
    process.exit(1);
  } finally {
    await connection.end();
  }
}

verifySchema();

