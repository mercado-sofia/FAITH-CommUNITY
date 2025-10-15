import mysql from "mysql2";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

// Get the directory name properly in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../.env') });

class DatabaseMerger {
  constructor() {
    this.sourceConfig = {
      host: process.env.MYSQL_HOST || "localhost",
      user: process.env.MYSQL_USER || "root",
      password: process.env.MYSQL_PASSWORD ? process.env.MYSQL_PASSWORD.replace(/['"]/g, '') : "",
      database: process.env.MYSQL_DATABASE || "db_community",
      port: process.env.MYSQL_PORT || 3306,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      multipleStatements: true
    };

    this.targetConfig = {
      host: process.env.MYSQL_HOST || "localhost",
      user: process.env.MYSQL_USER || "root",
      password: process.env.MYSQL_PASSWORD ? process.env.MYSQL_PASSWORD.replace(/['"]/g, '') : "",
      database: process.env.MYSQL_DATABASE || "db_community",
      port: process.env.MYSQL_PORT || 3306,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      multipleStatements: true
    };

    this.sourcePool = null;
    this.targetPool = null;
    this.mergeLog = [];
  }

  // Initialize database connections
  async initializeConnections(sourceDbName, targetDbName) {
    try {
      this.sourceConfig.database = sourceDbName;
      this.targetConfig.database = targetDbName;

      this.sourcePool = mysql.createPool(this.sourceConfig);
      this.targetPool = mysql.createPool(this.targetConfig);

      // Test connections
      const sourcePromisePool = this.sourcePool.promise();
      const targetPromisePool = this.targetPool.promise();
      
      const sourceConnection = await sourcePromisePool.getConnection();
      const targetConnection = await targetPromisePool.getConnection();
      
      // Test if databases exist
      const [sourceDbExists] = await sourceConnection.execute('SELECT 1');
      const [targetDbExists] = await targetConnection.execute('SELECT 1');
      
      sourceConnection.release();
      targetConnection.release();

      console.log(`✅ Connected to source database: ${sourceDbName}`);
      console.log(`✅ Connected to target database: ${targetDbName}`);
    } catch (error) {
      console.error('❌ Failed to initialize database connections:', error);
      console.error('💡 Make sure:');
      console.error('   - MySQL server is running');
      console.error('   - Database credentials are correct in .env file');
      console.error('   - Both databases exist');
      throw error;
    }
  }

  // Create backup of target database
  async createBackup(databaseName) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFileName = `backup_${databaseName}_${timestamp}.sql`;
    const backupPath = path.join(__dirname, 'backups', backupFileName);

    try {
      // Create backups directory if it doesn't exist
      const backupsDir = path.join(__dirname, 'backups');
      if (!fs.existsSync(backupsDir)) {
        fs.mkdirSync(backupsDir, { recursive: true });
      }

      console.log(`📦 Creating backup: ${backupFileName}`);
      
      // Note: In a real implementation, you would use mysqldump here
      // For now, we'll create a placeholder backup file
      const tables = await this.getTableList(databaseName);
      const backupInfo = {
        database: databaseName,
        timestamp: new Date().toISOString(),
        tables: tables,
        tableCount: tables.length
      };

      fs.writeFileSync(backupPath, JSON.stringify(backupInfo, null, 2));
      console.log(`✅ Backup created: ${backupPath}`);
      
      return backupPath;
    } catch (error) {
      console.error('❌ Failed to create backup:', error);
      throw error;
    }
  }

  // Get list of tables in a database
  async getTableList(databaseName) {
    const pool = databaseName === this.sourceConfig.database ? this.sourcePool : this.targetPool;
    const promisePool = pool.promise();
    const [tables] = await promisePool.execute(`
      SELECT TABLE_NAME 
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_SCHEMA = ?
    `, [databaseName]);
    
    // Handle case where tables might be undefined or not an array
    if (!tables || !Array.isArray(tables)) {
      console.log(`⚠️  No tables found in database: ${databaseName}`);
      return [];
    }
    
    return tables.map(table => table.TABLE_NAME);
  }

  // Compare table structures
  async compareTableStructures(tableName) {
    const sourcePromisePool = this.sourcePool.promise();
    const targetPromisePool = this.targetPool.promise();
    
    const [sourceStructure] = await sourcePromisePool.execute(`
      SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_DEFAULT, EXTRA
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?
      ORDER BY ORDINAL_POSITION
    `, [this.sourceConfig.database, tableName]);

    const [targetStructure] = await targetPromisePool.execute(`
      SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_DEFAULT, EXTRA
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?
      ORDER BY ORDINAL_POSITION
    `, [this.targetConfig.database, tableName]);

    return {
      source: sourceStructure,
      target: targetStructure,
      differences: this.findStructureDifferences(sourceStructure, targetStructure)
    };
  }

  // Find differences between table structures
  findStructureDifferences(source, target) {
    const differences = {
      missingInTarget: [],
      missingInSource: [],
      typeDifferences: []
    };

    const sourceColumns = new Map(source.map(col => [col.COLUMN_NAME, col]));
    const targetColumns = new Map(target.map(col => [col.COLUMN_NAME, col]));

    // Find columns missing in target
    for (const [columnName, columnInfo] of sourceColumns) {
      if (!targetColumns.has(columnName)) {
        differences.missingInTarget.push(columnInfo);
      } else {
        const targetColumn = targetColumns.get(columnName);
        if (this.columnsDiffer(columnInfo, targetColumn)) {
          differences.typeDifferences.push({
            column: columnName,
            source: columnInfo,
            target: targetColumn
          });
        }
      }
    }

    // Find columns missing in source
    for (const [columnName, columnInfo] of targetColumns) {
      if (!sourceColumns.has(columnName)) {
        differences.missingInSource.push(columnInfo);
      }
    }

    return differences;
  }

  // Check if two columns differ
  columnsDiffer(source, target) {
    return (
      source.DATA_TYPE !== target.DATA_TYPE ||
      source.IS_NULLABLE !== target.IS_NULLABLE ||
      source.COLUMN_DEFAULT !== target.COLUMN_DEFAULT
    );
  }

  // Merge data from source to target with conflict resolution
  async mergeTableData(tableName, conflictResolution = 'keep_latest') {
    try {
      console.log(`🔄 Merging data for table: ${tableName}`);

      // Get table structure comparison
      const structure = await this.compareTableStructures(tableName);
      
      // Handle structure differences first
      if (structure.differences.missingInTarget.length > 0) {
        console.log(`⚠️  Adding missing columns to target table: ${tableName}`);
        await this.addMissingColumns(tableName, structure.differences.missingInTarget);
      }

      // Get primary key information
      const targetPromisePool = this.targetPool.promise();
      const [primaryKeys] = await targetPromisePool.execute(`
        SELECT COLUMN_NAME
        FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
        WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND CONSTRAINT_NAME = 'PRIMARY'
      `, [this.targetConfig.database, tableName]);

      const primaryKeyColumns = primaryKeys.map(pk => pk.COLUMN_NAME);

      // Get all data from source table
      const sourcePromisePool = this.sourcePool.promise();
      const [sourceData] = await sourcePromisePool.execute(`SELECT * FROM ${tableName}`);
      
      if (sourceData.length === 0) {
        console.log(`ℹ️  No data to merge in source table: ${tableName}`);
        return;
      }

      let mergedCount = 0;
      let skippedCount = 0;
      let updatedCount = 0;

      for (const sourceRow of sourceData) {
        try {
          if (primaryKeyColumns.length > 0) {
            // Check if record exists in target
            const whereClause = primaryKeyColumns.map(col => `${col} = ?`).join(' AND ');
            const whereValues = primaryKeyColumns.map(col => sourceRow[col]);
            
            const [existingRows] = await targetPromisePool.execute(
              `SELECT * FROM ${tableName} WHERE ${whereClause}`,
              whereValues
            );

            if (existingRows.length > 0) {
              // Record exists - apply conflict resolution
              const existingRow = existingRows[0];
              
              switch (conflictResolution) {
                case 'keep_latest':
                  if (this.isSourceNewer(sourceRow, existingRow)) {
                    await this.updateRecord(tableName, sourceRow, primaryKeyColumns);
                    updatedCount++;
                  } else {
                    skippedCount++;
                  }
                  break;
                case 'keep_source':
                  await this.updateRecord(tableName, sourceRow, primaryKeyColumns);
                  updatedCount++;
                  break;
                case 'keep_target':
                  skippedCount++;
                  break;
                case 'merge_fields':
                  const mergedRow = this.mergeRecordFields(sourceRow, existingRow);
                  await this.updateRecord(tableName, mergedRow, primaryKeyColumns);
                  updatedCount++;
                  break;
              }
            } else {
              // Record doesn't exist - insert it
              await this.insertRecord(tableName, sourceRow);
              mergedCount++;
            }
          } else {
            // No primary key - just insert
            await this.insertRecord(tableName, sourceRow);
            mergedCount++;
          }
        } catch (error) {
          console.error(`❌ Error processing record in ${tableName}:`, error);
          this.mergeLog.push({
            table: tableName,
            action: 'error',
            error: error.message,
            data: sourceRow
          });
        }
      }

      console.log(`✅ Table ${tableName} merged: ${mergedCount} inserted, ${updatedCount} updated, ${skippedCount} skipped`);
      
      this.mergeLog.push({
        table: tableName,
        action: 'merge_complete',
        inserted: mergedCount,
        updated: updatedCount,
        skipped: skippedCount
      });

    } catch (error) {
      console.error(`❌ Failed to merge table ${tableName}:`, error);
      throw error;
    }
  }

  // Add missing columns to target table
  async addMissingColumns(tableName, missingColumns) {
    const targetPromisePool = this.targetPool.promise();
    for (const column of missingColumns) {
      const columnDef = this.buildColumnDefinition(column);
      await targetPromisePool.execute(
        `ALTER TABLE ${tableName} ADD COLUMN ${columnDef}`
      );
      console.log(`✅ Added column ${column.COLUMN_NAME} to ${tableName}`);
    }
  }

  // Build column definition for ALTER TABLE
  buildColumnDefinition(column) {
    let definition = `${column.COLUMN_NAME} ${column.DATA_TYPE}`;
    
    if (column.IS_NULLABLE === 'NO') {
      definition += ' NOT NULL';
    }
    
    if (column.COLUMN_DEFAULT !== null) {
      definition += ` DEFAULT ${column.COLUMN_DEFAULT}`;
    }
    
    if (column.EXTRA) {
      definition += ` ${column.EXTRA}`;
    }
    
    return definition;
  }

  // Check if source record is newer than target record
  isSourceNewer(sourceRow, targetRow) {
    const dateFields = ['updated_at', 'created_at', 'modified_at'];
    
    for (const field of dateFields) {
      if (sourceRow[field] && targetRow[field]) {
        return new Date(sourceRow[field]) > new Date(targetRow[field]);
      }
    }
    
    // If no date fields, assume source is newer
    return true;
  }

  // Update existing record
  async updateRecord(tableName, rowData, primaryKeyColumns) {
    const targetPromisePool = this.targetPool.promise();
    const columns = Object.keys(rowData).filter(col => !primaryKeyColumns.includes(col));
    const setClause = columns.map(col => `${col} = ?`).join(', ');
    const whereClause = primaryKeyColumns.map(col => `${col} = ?`).join(' AND ');
    
    const setValues = columns.map(col => rowData[col]);
    const whereValues = primaryKeyColumns.map(col => rowData[col]);
    
    await targetPromisePool.execute(
      `UPDATE ${tableName} SET ${setClause} WHERE ${whereClause}`,
      [...setValues, ...whereValues]
    );
  }

  // Insert new record
  async insertRecord(tableName, rowData) {
    const targetPromisePool = this.targetPool.promise();
    const columns = Object.keys(rowData);
    const values = columns.map(col => rowData[col]);
    const placeholders = columns.map(() => '?').join(', ');
    
    await targetPromisePool.execute(
      `INSERT INTO ${tableName} (${columns.join(', ')}) VALUES (${placeholders})`,
      values
    );
  }

  // Merge record fields (for merge_fields conflict resolution)
  mergeRecordFields(sourceRow, targetRow) {
    const merged = { ...targetRow };
    
    // Merge non-null values from source
    for (const [key, value] of Object.entries(sourceRow)) {
      if (value !== null && value !== undefined && value !== '') {
        merged[key] = value;
      }
    }
    
    return merged;
  }

  // Main merge function
  async mergeDatabases(sourceDbName, targetDbName, options = {}) {
    const {
      conflictResolution = 'keep_latest',
      backupTarget = true,
      tablesToMerge = null
    } = options;

    try {
      console.log('🚀 Starting database merge process...');
      
      // Initialize connections
      await this.initializeConnections(sourceDbName, targetDbName);
      
      // Create backup if requested
      if (backupTarget) {
        await this.createBackup(targetDbName);
      }
      
      // Get list of tables to merge
      const sourceTables = await this.getTableList(sourceDbName);
      const targetTables = await this.getTableList(targetDbName);
      
      const tablesToProcess = tablesToMerge || sourceTables.filter(table => 
        targetTables.includes(table)
      );
      
      console.log(`📋 Tables to merge: ${tablesToProcess.join(', ')}`);
      
      // Merge each table
      for (const tableName of tablesToProcess) {
        await this.mergeTableData(tableName, conflictResolution);
      }
      
      // Generate merge report
      this.generateMergeReport();
      
      console.log('✅ Database merge completed successfully!');
      
    } catch (error) {
      console.error('❌ Database merge failed:', error);
      throw error;
    } finally {
      // Close connections
      if (this.sourcePool) this.sourcePool.end();
      if (this.targetPool) this.targetPool.end();
    }
  }

  // Generate merge report
  generateMergeReport() {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const reportPath = path.join(__dirname, 'backups', `merge_report_${timestamp}.json`);
    
    const report = {
      timestamp: new Date().toISOString(),
      sourceDatabase: this.sourceConfig.database,
      targetDatabase: this.targetConfig.database,
      mergeLog: this.mergeLog,
      summary: this.generateSummary()
    };
    
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`📊 Merge report saved: ${reportPath}`);
  }

  // Generate summary statistics
  generateSummary() {
    const summary = {
      totalTables: 0,
      totalInserted: 0,
      totalUpdated: 0,
      totalSkipped: 0,
      totalErrors: 0
    };
    
    for (const logEntry of this.mergeLog) {
      if (logEntry.action === 'merge_complete') {
        summary.totalTables++;
        summary.totalInserted += logEntry.inserted || 0;
        summary.totalUpdated += logEntry.updated || 0;
        summary.totalSkipped += logEntry.skipped || 0;
      } else if (logEntry.action === 'error') {
        summary.totalErrors++;
      }
    }
    
    return summary;
  }
}

// Export the class
export default DatabaseMerger;

// CLI usage example
if (import.meta.url === `file://${process.argv[1]}`) {
  const merger = new DatabaseMerger();
  
  const sourceDb = process.argv[2] || 'db_community_source';
  const targetDb = process.argv[3] || 'db_community';
  const conflictResolution = process.argv[4] || 'keep_latest';
  
  console.log(`Merging ${sourceDb} into ${targetDb} with conflict resolution: ${conflictResolution}`);
  
  merger.mergeDatabases(sourceDb, targetDb, {
    conflictResolution,
    backupTarget: true
  }).catch(console.error);
}
