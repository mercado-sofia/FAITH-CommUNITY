# Backend Scripts

This directory contains essential utility scripts for database management and debugging. The scripts are **production-ready** with environment-based command restrictions.

## Available Scripts

- `utilities.js` - Consolidated utility script with multiple functions (production-safe)

## Usage

Run the utilities script from the backend root directory with a command:

```bash
# Show help and available commands
node scripts/utilities.js help

# Create superadmin account
node scripts/utilities.js create-superadmin

# Check all database data
node scripts/utilities.js check-data

# Fix missing tables and data
node scripts/utilities.js fix-missing-data

# Production health check (recommended for production)
node scripts/utilities.js production-health-check

# Debug collaboration data (development only)
node scripts/utilities.js debug-collaborations
```

## Environment-Based Commands

### 🏭 Production Mode (`NODE_ENV=production`)
**Safe commands only:**
- `create-superadmin` - Create initial superadmin account
- `check-data` - Database health check and overview
- `fix-missing-data` - Database repair and maintenance
- `production-health-check` - Production health monitoring
- `help` - Command reference

**Blocked commands:**
- `debug-collaborations` - Not available in production

### 🛠️ Development Mode (`NODE_ENV=development`)
**All commands available:**
- All production-safe commands
- `debug-collaborations` - Development debugging

## Available Commands

### `create-superadmin`
Creates the initial superadmin account for system setup.
- **Purpose**: Essential for initial system setup and fresh deployments
- **Usage**: `node scripts/utilities.js create-superadmin`
- **Output**: Creates superadmin with email `superadmin@faith-community.com` and password `admin123`
- **Notes**: Checks if superadmin already exists before creating
- **Environment**: ✅ Production-safe

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

# Create superadmin if needed
node scripts/utilities.js create-superadmin

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

## Notes

- All functions connect to the database using the configuration in `src/database.js`
- Scripts will automatically exit after completion
- Check the console output for success/error messages
- Use `help` command to see available options for your environment
- The superadmin script is essential for initial system setup
- The production-health-check script is recommended for production monitoring
- Debug commands are automatically blocked in production environments
