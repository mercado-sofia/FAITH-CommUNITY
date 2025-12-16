# Database Management Scripts

This directory contains essential utility scripts for database management and debugging. The scripts are **production-ready** with environment-based command restrictions.

## Available Scripts

- `utilities.js` - Consolidated utility script with multiple functions (production-safe)
- `initialize-superadmin.js` - Initialize superadmin account via API endpoint (for production/deployed environments)
- `databaseMerger.js` - Database merger class
- `mergeDatabases.js` - Interactive database merger tool

## Utilities Script

Main utility script with various database management functions.

**Usage:**
```bash
node scripts/utilities.js <command>
```

**Available Commands:**
- `check-data` - Check all database data and show summary
- `fix-missing-data` - Check and fix all missing tables and data
- `production-health-check` - Production health monitoring (recommended for production)
- `debug-collaborations` - Debug collaboration data and relationships (development only)
- `help` - Show help message

**Note:** Superadmin initialization is now handled via the API endpoint. Use `initialize-superadmin.js` instead.

**Examples:**
```bash
# Show help and available commands
node scripts/utilities.js help

# Check all database data
node scripts/utilities.js check-data

# Fix missing tables and data
node scripts/utilities.js fix-missing-data

# Production health check (recommended for production)
node scripts/utilities.js production-health-check

# Debug collaboration data (development only)
node scripts/utilities.js debug-collaborations

# Initialize superadmin account (for production/deployed environments)
BACKEND_URL=https://your-backend.railway.app JWT_SECRET=your-secret node scripts/initialize-superadmin.js
```

## Environment-Based Commands

### 🏭 Production Mode (`NODE_ENV=production`)
**Safe commands only:**
- `check-data` - Database health check and overview
- `fix-missing-data` - Database repair and maintenance
- `production-health-check` - Production health monitoring
- `help` - Command reference

**Blocked commands:**
- `debug-collaborations` - Not available in production

**Note:** For superadmin initialization in production, use `initialize-superadmin.js` which calls the API endpoint.

### 🛠️ Development Mode (`NODE_ENV=development`)
**All commands available:**
- All production-safe commands
- `debug-collaborations` - Development debugging

## Superadmin Initialization

**Important:** Superadmin initialization is now handled via the API endpoint, not through `utilities.js`.

### Using `initialize-superadmin.js` (Recommended for Production)
- **Purpose**: Initialize/reset superadmin account via API endpoint (works with deployed backends)
- **Usage**: `BACKEND_URL=https://your-backend.railway.app JWT_SECRET=your-secret node scripts/initialize-superadmin.js`
- **Output**: Initializes superadmin with credentials from environment variables
- **Notes**: Works with deployed backends, uses the unified `users` table with `role='superadmin'`
- **See**: `backend/docs/04-deployment/INITIALIZE_SUPERADMIN.md` for complete documentation

## Available Commands

### `check-data`
Checks all database data and shows a comprehensive summary.
- **Purpose**: Database health check and data overview
- **Usage**: `node scripts/utilities.js check-data`
- **Output**: Shows counts and status of all tables, organizations, users, programs, submissions, etc.
- **Use Case**: Monitoring database health, debugging data issues
- **Environment**: ✅ Production-safe

### `fix-missing-data`
Checks and fixes missing tables and data automatically.
- **Purpose**: Database repair and maintenance
- **Usage**: `node scripts/utilities.js fix-missing-data`
- **Output**: Creates missing tables, fixes data inconsistencies, shows repair summary
- **Use Case**: Database maintenance, fixing corrupted installations
- **Environment**: ✅ Production-safe

### `production-health-check` ⭐ **NEW**
Production-safe health check without exposing sensitive data.
- **Purpose**: Production health monitoring and system verification
- **Usage**: `node scripts/utilities.js production-health-check`
- **Output**: Database connectivity, critical tables, data counts, system status
- **Use Case**: Production monitoring, health checks, deployment verification
- **Environment**: ✅ Production-safe (recommended for production)

### `debug-collaborations`
Debugs collaboration data and relationships for troubleshooting.
- **Purpose**: Useful for troubleshooting collaboration issues in development
- **Usage**: `node scripts/utilities.js debug-collaborations`
- **Output**: Shows detailed collaboration information including status, participants, and program details
- **Use Case**: Troubleshooting collaboration workflow issues
- **Environment**: ❌ Development-only (blocked in production)

### `help`
Shows available commands and usage information.
- **Purpose**: Quick reference for all available commands
- **Usage**: `node scripts/utilities.js help`
- **Output**: Lists commands based on environment (production vs development)
- **Use Case**: Quick reference when working with scripts
- **Environment**: ✅ Production-safe

## Production Deployment

### For Production Hosting:
```bash
# Set production environment
export NODE_ENV=production

# Run production health check
node scripts/utilities.js production-health-check

# Initialize superadmin if needed (via API endpoint)
BACKEND_URL=https://your-backend.railway.app JWT_SECRET=your-secret node scripts/initialize-superadmin.js

# Fix any missing data
node scripts/utilities.js fix-missing-data
```

### For Development:
```bash
# Development environment (default)
export NODE_ENV=development

# All commands available including debug
node scripts/utilities.js debug-collaborations
```

## Security Features

- **Environment Detection**: Automatically detects production vs development
- **Command Restrictions**: Blocks development-only commands in production
- **Safe Data Exposure**: Production health check doesn't expose sensitive data
- **Error Handling**: Comprehensive error handling with clear messages
- **Exit Codes**: Proper exit codes for automation and monitoring

## Database Merger Utilities

### `databaseMerger.js` - Database Merger Class

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

### `mergeDatabases.js` - Interactive Database Merger

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
├── README.md                        # This file
├── utilities.js                     # Main utility script
├── initialize-superadmin.js         # Superadmin initialization via API endpoint
├── databaseMerger.js                # Database merger class
├── mergeDatabases.js                # Interactive merger tool
└── backups/                         # Backup files and merge reports (created by databaseMerger)
    ├── backup_*.sql                 # Database backups
    └── merge_report_*.json          # Merge reports
```

## Environment Variables

Make sure your `.env` file contains:
```env
MYSQL_HOST=localhost
MYSQL_USER=root
MYSQL_PASSWORD=your_password
MYSQL_DATABASE=db_community
```

## Notes

- All functions connect to the database using the configuration in `src/database.js`
- Scripts will automatically exit after completion
- Check the console output for success/error messages
- Use `help` command to see available options for your environment
- For superadmin initialization, use `initialize-superadmin.js` (see `backend/docs/04-deployment/INITIALIZE_SUPERADMIN.md`)
- The production-health-check script is recommended for production monitoring
- Debug commands are automatically blocked in production environments
