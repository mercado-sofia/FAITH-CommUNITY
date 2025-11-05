// Script to add edited_by_name and edited_by_role columns to programs_projects table
import db from '../src/database.js';

const addEditedByColumns = async () => {
  try {
    console.log('Checking and adding edited_by_name and edited_by_role columns...\n');
    
    const connection = await db.getConnection();
    
    try {
      // Check if edited_by_name column exists
      const [nameColumns] = await connection.execute(`
        SELECT COLUMN_NAME 
        FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_SCHEMA = DATABASE() 
        AND TABLE_NAME = 'programs_projects' 
        AND COLUMN_NAME = 'edited_by_name'
      `);
      
      if (nameColumns.length === 0) {
        console.log('Adding edited_by_name column...');
        await connection.execute(`
          ALTER TABLE programs_projects 
          ADD COLUMN edited_by_name VARCHAR(100) NULL
        `);
        console.log('✓ edited_by_name column added successfully');
      } else {
        console.log('✓ edited_by_name column already exists');
      }
      
      // Check if edited_by_role column exists
      const [roleColumns] = await connection.execute(`
        SELECT COLUMN_NAME 
        FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_SCHEMA = DATABASE() 
        AND TABLE_NAME = 'programs_projects' 
        AND COLUMN_NAME = 'edited_by_role'
      `);
      
      if (roleColumns.length === 0) {
        console.log('Adding edited_by_role column...');
        await connection.execute(`
          ALTER TABLE programs_projects 
          ADD COLUMN edited_by_role VARCHAR(100) NULL
        `);
        console.log('✓ edited_by_role column added successfully');
      } else {
        console.log('✓ edited_by_role column already exists');
      }
      
      await connection.commit();
      console.log('\n✓ Migration completed successfully!');
      
      // Verify the columns were added
      const [verifyColumns] = await connection.execute(`
        SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE
        FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_SCHEMA = DATABASE() 
        AND TABLE_NAME = 'programs_projects' 
        AND COLUMN_NAME IN ('edited_by_name', 'edited_by_role')
      `);
      
      console.log('\nVerification:');
      console.log('Columns in database:');
      verifyColumns.forEach(col => {
        console.log(`  - ${col.COLUMN_NAME} (${col.DATA_TYPE}, nullable: ${col.IS_NULLABLE})`);
      });
      
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
    
    await db.end();
    process.exit(0);
  } catch (error) {
    console.error('Error adding columns:', error);
    process.exit(1);
  }
};

addEditedByColumns();

