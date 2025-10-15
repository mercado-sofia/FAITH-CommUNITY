# Backend Scripts

This directory contains essential utility scripts for database management and debugging.

## Available Scripts

- `utilities.js` - Consolidated utility script with multiple functions

## Usage

Run the utilities script from the backend root directory with a command:

```bash
# Show help and available commands
node scripts/utilities.js help

# Create superadmin account
node scripts/utilities.js create-superadmin

# Debug collaboration data
node scripts/utilities.js debug-collaborations
```

## Available Commands

### `create-superadmin`
Creates the initial superadmin account for system setup.
- **Purpose**: Essential for initial system setup and fresh deployments
- **Usage**: `node scripts/utilities.js create-superadmin`
- **Output**: Creates superadmin with email `superadmin@faith-community.com` and password `admin123`

### `debug-collaborations`
Debugs collaboration data and relationships for troubleshooting.
- **Purpose**: Useful for troubleshooting collaboration issues in development and production
- **Usage**: `node scripts/utilities.js debug-collaborations`
- **Output**: Shows detailed collaboration information including status, participants, and program details

## Notes

- All functions connect to the database using the configuration in `src/database.js`
- Scripts will automatically exit after completion
- Check the console output for success/error messages
- Use `help` command to see available options
- The superadmin script is essential for initial system setup
- The debug script is useful for troubleshooting collaboration issues
