# Database Migration Scripts

This directory contains SQL migration scripts to migrate from the old separate user tables (`users`, `admins`, `superadmin`) to the new unified `users` table structure.

## ⚠️ IMPORTANT: Before Running Migrations

1. **BACKUP YOUR DATABASE FIRST!**
   ```bash
   mysqldump -u root -p db_community > backup_before_migration.sql
   ```

2. **Stop your backend server** before running migrations

3. **Review each script** to understand what it does

## Migration Steps

The migration consists of 7 steps that must be run in order:

### Step 1: Create Backup Tables
```bash
mysql -u root -p db_community < 01_create_backup_tables.sql
```
Creates backup copies of old tables (`users_old_backup`, `admins_old_backup`, `superadmin_old_backup`)

### Step 2: Create Unified Users Table
```bash
mysql -u root -p db_community < 02_create_unified_users_table.sql
```
Creates the new `users_new` table and `user_profiles` table

### Step 3: Migrate Users Data
```bash
mysql -u root -p db_community < 03_migrate_users_data.sql
```
Migrates data from old `users` table to `users_new` and `user_profiles`

### Step 4: Migrate Admins Data
```bash
mysql -u root -p db_community < 04_migrate_admins_data.sql
```
Migrates data from old `admins` table to `users_new`

### Step 5: Migrate Superadmin Data
```bash
mysql -u root -p db_community < 05_migrate_superadmin_data.sql
```
Migrates data from old `superadmin` table to `users_new`

### Step 6: Update Foreign Keys
```bash
mysql -u root -p db_community < 06_update_foreign_keys.sql
```
Updates all foreign key references to point to the new unified table

### Step 7: Rename Tables (FINAL STEP)
```bash
mysql -u root -p db_community < 07_rename_tables.sql
```
Renames old tables and promotes `users_new` to `users`. **This is permanent!**

## Running All Migrations at Once

You can run all migrations in sequence using:

```bash
# Windows (PowerShell)
Get-Content 01_create_backup_tables.sql, 02_create_unified_users_table.sql, 03_migrate_users_data.sql, 04_migrate_admins_data.sql, 05_migrate_superadmin_data.sql, 06_update_foreign_keys.sql, 07_rename_tables.sql | mysql -u root -p db_community

# Linux/Mac
cat 01_create_backup_tables.sql 02_create_unified_users_table.sql 03_migrate_users_data.sql 04_migrate_admins_data.sql 05_migrate_superadmin_data.sql 06_update_foreign_keys.sql 07_rename_tables.sql | mysql -u root -p db_community
```

## Verification

After running all migrations, verify the migration was successful:

```sql
USE db_community;

-- Check users table structure
DESCRIBE users;

-- Check user counts by role
SELECT role, COUNT(*) as count FROM users GROUP BY role;

-- Check user_profiles table
SELECT COUNT(*) as profile_count FROM user_profiles;

-- Verify foreign keys
SELECT 
  TABLE_NAME,
  CONSTRAINT_NAME,
  REFERENCED_TABLE_NAME,
  REFERENCED_COLUMN_NAME
FROM information_schema.KEY_COLUMN_USAGE
WHERE TABLE_SCHEMA = 'db_community'
AND REFERENCED_TABLE_NAME = 'users';
```

## Rollback (If Needed)

If something goes wrong, you can rollback:

```sql
USE db_community;

-- Drop the new tables
DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS user_profiles;

-- Restore old tables from backups
RENAME TABLE users_old_backup TO users;
RENAME TABLE admins_old_backup TO admins;
RENAME TABLE superadmin_old_backup TO superadmin;
```

## Troubleshooting

### Error: "Table already exists"
- The migration may have been partially run
- Check which tables exist: `SHOW TABLES;`
- You may need to drop `users_new` if it exists: `DROP TABLE IF EXISTS users_new;`

### Error: "Foreign key constraint fails"
- Make sure all referenced tables exist
- Check that organization IDs in admins table exist in organizations table
- Verify data integrity before running migrations

### Error: "Duplicate entry for key 'PRIMARY'"
- There may be ID conflicts between old tables
- The migration scripts handle this, but you may need to manually resolve conflicts

## Notes

- Old tables are renamed to `users_old`, `admins_old`, `superadmin_old` (not deleted)
- Backup tables (`*_old_backup`) are also created for extra safety
- The migration preserves all data from old tables
- Email addresses must be unique across all roles (enforced by database)

