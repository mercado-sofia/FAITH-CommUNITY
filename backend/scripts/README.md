# Database Management Scripts

This directory contains utility scripts for managing the FAITH CommUNITY database.

## Available Scripts

### 1. `utilities.js` - General Database Utilities

Main utility script with various database management functions.

**Usage:**
```bash
node scripts/utilities.js <command>
```

**Available Commands:**
- `create-superadmin` - Create the initial superadmin account
- `check-data` - Check all database data and show summary
- `fix-missing-data` - Check and fix all missing tables and data
- `debug-collaborations` - Debug collaboration data and relationships
- `help` - Show help message

**Examples:**
```bash
node scripts/utilities.js create-superadmin
node scripts/utilities.js check-data
node scripts/utilities.js fix-missing-data
```

### 2. `databaseMerger.js` - Database Merger Class

A comprehensive database merger utility that can combine two databases with duplicate content.

**Features:**
- Automatic backup creation
- Schema comparison and synchronization
- Multiple conflict resolution strategies
- Detailed merge reporting
- Support for specific table merging

**Conflict Resolution Strategies:**
- `keep_latest` - Keep the record with the most recent timestamp
- `keep_source` - Always keep the source database record
- `keep_target` - Always keep the target database record
- `merge_fields` - Merge non-null fields from source into target

**Usage:**
```javascript
import DatabaseMerger from './databaseMerger.js';

const merger = new DatabaseMerger();
await merger.mergeDatabases('source_db', 'target_db', {
  conflictResolution: 'keep_latest',
  backupTarget: true,
  tablesToMerge: ['users', 'programs_projects'] // optional
});
```

### 3. `mergeDatabases.js` - Interactive Database Merger

An interactive command-line tool for merging databases.

**Usage:**
```bash
node scripts/mergeDatabases.js
```

This will prompt you for:
- Source database name (database to merge FROM)
- Target database name (database to merge TO)
- Conflict resolution strategy
- Whether to create a backup
- Specific tables to merge (optional)

## Database Merge Process

### Step 1: Backup
Always create a backup of your target database before merging:
```bash
mysqldump -u root -p target_database > backup_target_database.sql
```

### Step 2: Compare Databases
The merger will automatically:
- Compare table structures
- Identify missing columns
- Detect schema differences

### Step 3: Merge Data
The merger will:
- Add missing columns to target tables
- Merge data with your chosen conflict resolution strategy
- Generate detailed reports

### Step 4: Review Results
Check the generated merge report in the `backups/` directory for:
- Number of records inserted/updated/skipped
- Any errors encountered
- Summary statistics

## Example Merge Scenarios

### Scenario 1: Development to Production
```bash
# Merge development database into production
node scripts/mergeDatabases.js
# Source: db_community_dev
# Target: db_community_prod
# Strategy: keep_latest
```

### Scenario 2: Team Member's Changes
```bash
# Merge team member's database changes
node scripts/mergeDatabases.js
# Source: db_community_teammate
# Target: db_community
# Strategy: merge_fields
```

### Scenario 3: Specific Tables Only
```javascript
// Merge only specific tables
const merger = new DatabaseMerger();
await merger.mergeDatabases('source_db', 'target_db', {
  conflictResolution: 'keep_source',
  tablesToMerge: ['users', 'programs_projects', 'news']
});
```

## Safety Features

1. **Automatic Backups** - Creates timestamped backups before merging
2. **Schema Validation** - Ensures table structures are compatible
3. **Conflict Resolution** - Multiple strategies for handling duplicate data
4. **Detailed Logging** - Comprehensive merge reports and error tracking
5. **Rollback Capability** - Backups allow easy rollback if needed

## Troubleshooting

### Common Issues

1. **Connection Errors**
   - Verify database credentials in `.env` file
   - Ensure MySQL server is running
   - Check database names exist

2. **Schema Conflicts**
   - The merger will automatically add missing columns
   - Review the merge report for any schema issues

3. **Data Conflicts**
   - Choose appropriate conflict resolution strategy
   - Review merge report for conflict details

### Getting Help

Run the help command for more information:
```bash
node scripts/utilities.js help
```

## File Structure

```
backend/scripts/
├── README.md              # This file
├── utilities.js           # Main utility script
├── databaseMerger.js      # Database merger class
├── mergeDatabases.js      # Interactive merger tool
└── backups/               # Backup files and merge reports
    ├── backup_*.sql       # Database backups
    └── merge_report_*.json # Merge reports
```

## Environment Variables

Make sure your `.env` file contains:
```env
MYSQL_HOST=localhost
MYSQL_USER=root
MYSQL_PASSWORD=your_password
MYSQL_DATABASE=db_community
```