@echo off
REM Windows batch script to run database migration
REM Make sure MySQL is in your PATH or update the mysql command path

echo ========================================
echo Database Migration Script
echo ========================================
echo.
echo WARNING: This will modify your database structure!
echo Make sure you have a backup before proceeding.
echo.
pause

set DB_NAME=db_community
set DB_USER=root
set MIGRATION_DIR=scripts\migrations

echo.
echo Step 1: Creating backup tables...
mysql -u %DB_USER% -p %DB_NAME% < %MIGRATION_DIR%\01_create_backup_tables.sql
if errorlevel 1 (
    echo ERROR: Failed to create backup tables
    pause
    exit /b 1
)

echo.
echo Step 2: Creating unified users table...
mysql -u %DB_USER% -p %DB_NAME% < %MIGRATION_DIR%\02_create_unified_users_table.sql
if errorlevel 1 (
    echo ERROR: Failed to create unified users table
    pause
    exit /b 1
)

echo.
echo Step 3: Migrating users data...
mysql -u %DB_USER% -p %DB_NAME% < %MIGRATION_DIR%\03_migrate_users_data.sql
if errorlevel 1 (
    echo ERROR: Failed to migrate users data
    pause
    exit /b 1
)

echo.
echo Step 4: Migrating admins data...
mysql -u %DB_USER% -p %DB_NAME% < %MIGRATION_DIR%\04_migrate_admins_data.sql
if errorlevel 1 (
    echo ERROR: Failed to migrate admins data
    pause
    exit /b 1
)

echo.
echo Step 5: Migrating superadmin data...
mysql -u %DB_USER% -p %DB_NAME% < %MIGRATION_DIR%\05_migrate_superadmin_data.sql
if errorlevel 1 (
    echo ERROR: Failed to migrate superadmin data
    pause
    exit /b 1
)

echo.
echo Step 6: Updating foreign keys...
mysql -u %DB_USER% -p %DB_NAME% < %MIGRATION_DIR%\06_update_foreign_keys.sql
if errorlevel 1 (
    echo ERROR: Failed to update foreign keys
    pause
    exit /b 1
)

echo.
echo Step 7: Renaming tables (FINAL STEP)...
echo WARNING: This is the final step and will make changes permanent!
pause
mysql -u %DB_USER% -p %DB_NAME% < %MIGRATION_DIR%\07_rename_tables.sql
if errorlevel 1 (
    echo ERROR: Failed to rename tables
    pause
    exit /b 1
)

echo.
echo ========================================
echo Migration completed successfully!
echo ========================================
echo.
echo Old tables are now: users_old, admins_old, superadmin_old
echo New unified table is: users
echo.
pause

