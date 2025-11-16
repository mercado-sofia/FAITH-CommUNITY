-- Complete Migration Script: Unified Users Table Migration
-- This script runs all migration steps in order
-- WARNING: This will modify your database structure permanently
-- Make sure you have backups before running this!

USE db_community;

-- Step 1: Create backup tables
SOURCE backend/scripts/migrations/01_create_backup_tables.sql;

-- Step 2: Create unified users table
SOURCE backend/scripts/migrations/02_create_unified_users_table.sql;

-- Step 3: Migrate users data
SOURCE backend/scripts/migrations/03_migrate_users_data.sql;

-- Step 4: Migrate admins data
SOURCE backend/scripts/migrations/04_migrate_admins_data.sql;

-- Step 5: Migrate superadmin data
SOURCE backend/scripts/migrations/05_migrate_superadmin_data.sql;

-- Step 6: Update foreign keys
SOURCE backend/scripts/migrations/06_update_foreign_keys.sql;

-- Step 7: Rename tables (FINAL STEP)
SOURCE backend/scripts/migrations/07_rename_tables.sql;

SELECT 'Migration completed successfully!' AS status;

