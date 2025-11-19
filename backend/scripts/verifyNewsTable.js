/**
 * Script to verify the news table structure
 * Run from backend directory with: node scripts/verifyNewsTable.js
 */

import db from '../src/database.js';

async function verifyNewsTable() {
  try {
    console.log('🔍 Verifying news table structure...\n');

    // Check if table exists
    const [tables] = await db.execute(`
      SELECT TABLE_NAME 
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'news'
    `);

    if (tables.length === 0) {
      console.error('❌ News table does not exist!');
      process.exit(1);
    }

    console.log('✅ News table exists\n');

    // Get all columns
    const [columns] = await db.execute(`
      SELECT 
        COLUMN_NAME,
        DATA_TYPE,
        IS_NULLABLE,
        COLUMN_DEFAULT,
        COLUMN_TYPE
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'news'
      ORDER BY ORDINAL_POSITION
    `);

    console.log('📋 Table columns:');
    console.log('─'.repeat(80));
    
    const requiredColumns = {
      'id': 'INT',
      'organization_id': 'INT',
      'title': 'VARCHAR',
      'slug': 'VARCHAR',
      'content': 'LONGTEXT',
      'excerpt': 'TEXT',
      'featured_image': 'VARCHAR',
      'date': 'DATE',
      'published_at': 'DATETIME',
      'status': 'ENUM',
      'is_deleted': 'BOOLEAN',
      'deleted_at': 'TIMESTAMP',
      'created_at': 'TIMESTAMP',
      'updated_at': 'TIMESTAMP'
    };

    const foundColumns = {};
    
    columns.forEach(col => {
      foundColumns[col.COLUMN_NAME] = true;
      const isRequired = requiredColumns[col.COLUMN_NAME];
      const status = isRequired ? '✅' : '⚠️';
      console.log(`${status} ${col.COLUMN_NAME.padEnd(20)} ${col.COLUMN_TYPE.padEnd(30)} ${col.IS_NULLABLE === 'YES' ? 'NULL' : 'NOT NULL'} ${col.COLUMN_DEFAULT ? `DEFAULT: ${col.COLUMN_DEFAULT}` : ''}`);
    });

    console.log('─'.repeat(80));
    console.log('\n🔍 Checking required columns...\n');

    let allColumnsExist = true;
    for (const [colName, colType] of Object.entries(requiredColumns)) {
      if (!foundColumns[colName]) {
        console.error(`❌ Missing required column: ${colName} (${colType})`);
        allColumnsExist = false;
      }
    }

    if (allColumnsExist) {
      console.log('✅ All required columns exist\n');
    }

    // Check indexes
    const [indexes] = await db.execute(`
      SELECT 
        INDEX_NAME,
        COLUMN_NAME,
        NON_UNIQUE
      FROM INFORMATION_SCHEMA.STATISTICS 
      WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'news'
      ORDER BY INDEX_NAME, SEQ_IN_INDEX
    `);

    console.log('📊 Indexes:');
    console.log('─'.repeat(80));
    const indexMap = {};
    indexes.forEach(idx => {
      if (!indexMap[idx.INDEX_NAME]) {
        indexMap[idx.INDEX_NAME] = [];
      }
      indexMap[idx.INDEX_NAME].push(idx.COLUMN_NAME);
    });

    Object.entries(indexMap).forEach(([idxName, cols]) => {
      const type = idxName === 'PRIMARY' ? 'PRIMARY KEY' : (indexes.find(i => i.INDEX_NAME === idxName)?.NON_UNIQUE === 0 ? 'UNIQUE' : 'INDEX');
      console.log(`${type.padEnd(12)} ${idxName.padEnd(30)} (${cols.join(', ')})`);
    });

    console.log('─'.repeat(80));
    console.log('\n');

    // Check status column specifically
    const statusColumn = columns.find(col => col.COLUMN_NAME === 'status');
    if (statusColumn) {
      console.log('✅ Status column exists');
      console.log(`   Type: ${statusColumn.COLUMN_TYPE}`);
      console.log(`   Default: ${statusColumn.COLUMN_DEFAULT || 'NULL'}`);
      
      // Check if it has the correct ENUM values
      if (statusColumn.COLUMN_TYPE.includes('draft') && 
          statusColumn.COLUMN_TYPE.includes('scheduled') &&
          statusColumn.COLUMN_TYPE.includes('published') &&
          statusColumn.COLUMN_TYPE.includes('archived')) {
        console.log('✅ Status column has correct ENUM values');
      } else {
        console.warn('⚠️  Status column ENUM values may be incorrect');
        console.warn(`   Current: ${statusColumn.COLUMN_TYPE}`);
      }
    } else {
      console.error('❌ Status column is missing!');
      console.error('   Run the migration to add it: node scripts/addNewsStatusColumn.js');
      allColumnsExist = false;
    }

    console.log('\n');

    // Check published_at column
    const publishedAtColumn = columns.find(col => col.COLUMN_NAME === 'published_at');
    if (publishedAtColumn) {
      console.log('✅ published_at column exists');
      console.log(`   Type: ${publishedAtColumn.COLUMN_TYPE}`);
      console.log(`   Nullable: ${publishedAtColumn.IS_NULLABLE}`);
    } else {
      console.error('❌ published_at column is missing!');
      allColumnsExist = false;
    }

    console.log('\n');

    if (allColumnsExist) {
      console.log('✅ News table structure is correct!\n');
      process.exit(0);
    } else {
      console.error('❌ News table structure has issues. Please fix them before proceeding.\n');
      process.exit(1);
    }

  } catch (error) {
    console.error('❌ Error verifying news table:', error);
    process.exit(1);
  } finally {
    // Close database connection
    if (db && db.end) {
      await db.end();
    }
  }
}

verifyNewsTable();

