import mysql from 'mysql2/promise';

const dbConfig = {
  host: process.env.MYSQL_HOST || 'localhost',
  port: process.env.MYSQL_PORT || 3306,
  user: process.env.MYSQL_USER || 'root',
  password: process.env.MYSQL_PASSWORD || '',
  database: process.env.MYSQL_DATABASE || 'db_community'
};

async function listTables() {
  const connection = await mysql.createConnection(dbConfig);
  
  try {
    const [tables] = await connection.query('SHOW TABLES');
    const tableNames = tables.map(t => Object.values(t)[0]);
    
    console.log('='.repeat(60));
    console.log('ALL TABLES IN DATABASE');
    console.log('='.repeat(60));
    console.log();
    
    // Categorize tables
    const newTables = tableNames.filter(name => 
      name === 'users' || name === 'user_profiles'
    );
    
    const backupTables = tableNames.filter(name => 
      name.includes('_old_backup') || name.includes('_backup')
    );
    
    const oldRenamedTables = tableNames.filter(name => 
      name.includes('_old') && !name.includes('_backup')
    );
    
    const otherTables = tableNames.filter(name => 
      !newTables.includes(name) && 
      !backupTables.includes(name) && 
      !oldRenamedTables.includes(name)
    );
    
    console.log('✅ NEW TABLES (Added by migration):');
    newTables.forEach((name, i) => console.log(`   ${i + 1}. ${name}`));
    console.log();
    
    if (oldRenamedTables.length > 0) {
      console.log('📦 OLD TABLES (Renamed during migration):');
      oldRenamedTables.forEach((name, i) => console.log(`   ${i + 1}. ${name}`));
      console.log();
    }
    
    if (backupTables.length > 0) {
      console.log('💾 BACKUP TABLES (Created during migration):');
      backupTables.forEach((name, i) => console.log(`   ${i + 1}. ${name}`));
      console.log();
    }
    
    if (otherTables.length > 0) {
      console.log('📋 OTHER EXISTING TABLES:');
      otherTables.forEach((name, i) => console.log(`   ${i + 1}. ${name}`));
      console.log();
    }
    
    console.log('='.repeat(60));
    console.log(`Total: ${tableNames.length} tables`);
    console.log(`New tables added: ${newTables.length}`);
    console.log('='.repeat(60));
    
  } catch (error) {
    console.error('❌ Error listing tables:', error.message);
    process.exit(1);
  } finally {
    await connection.end();
  }
}

listTables();

