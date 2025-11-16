import mysql from 'mysql2/promise';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Database configuration
const dbConfig = {
  host: process.env.MYSQL_HOST || 'localhost',
  port: process.env.MYSQL_PORT || 3306,
  user: process.env.MYSQL_USER || 'root',
  password: process.env.MYSQL_PASSWORD || '',
  database: process.env.MYSQL_DATABASE || 'db_community',
  multipleStatements: true
};

// Migration files in order
const migrationFiles = [
  '01_create_backup_tables.sql',
  '02_create_unified_users_table.sql',
  '03_migrate_users_data.sql',
  '04_migrate_admins_data.sql',
  '05_migrate_superadmin_data.sql',
  '06_update_foreign_keys.sql',
  '07_rename_tables.sql'
];

async function runMigration() {
  let connection;
  
  try {
    console.log('Connecting to database...');
    connection = await mysql.createConnection(dbConfig);
    console.log('Connected successfully!\n');

    const migrationsDir = path.join(__dirname, 'migrations');

    for (let i = 0; i < migrationFiles.length; i++) {
      const file = migrationFiles[i];
      const filePath = path.join(migrationsDir, file);
      
      console.log(`\n${'='.repeat(50)}`);
      console.log(`Step ${i + 1}/${migrationFiles.length}: ${file}`);
      console.log('='.repeat(50));
      
      if (!fs.existsSync(filePath)) {
        console.error(`ERROR: File not found: ${filePath}`);
        process.exit(1);
      }

      const sql = fs.readFileSync(filePath, 'utf8');
      
      try {
        await connection.query(sql);
        console.log(`✅ ${file} executed successfully`);
      } catch (error) {
        // Some errors are expected (like tables not existing)
        if (error.code === 'ER_NO_SUCH_TABLE' || error.code === 'ER_BAD_TABLE_ERROR') {
          console.log(`⚠️  Warning: ${error.message}`);
          console.log(`   (This is expected if the table doesn't exist)`);
        } else if (error.code === 'ER_DUP_ENTRY' || error.code === 'ER_DUP_KEYNAME') {
          console.log(`⚠️  Warning: ${error.message}`);
          console.log(`   (This is expected if the constraint already exists)`);
        } else {
          console.error(`❌ ERROR executing ${file}:`);
          console.error(`   Code: ${error.code}`);
          console.error(`   Message: ${error.message}`);
          throw error;
        }
      }
    }

    console.log('\n' + '='.repeat(50));
    console.log('✅ Migration completed successfully!');
    console.log('='.repeat(50));
    console.log('\nOld tables are now: users_old, admins_old, superadmin_old');
    console.log('New unified table is: users\n');

  } catch (error) {
    console.error('\n❌ Migration failed:');
    console.error(`   Code: ${error.code}`);
    console.error(`   Message: ${error.message}`);
    if (error.sql) {
      console.error(`   SQL: ${error.sql.substring(0, 200)}...`);
    }
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
      console.log('Database connection closed.');
    }
  }
}

// Run the migration
runMigration();

