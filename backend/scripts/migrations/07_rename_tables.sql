-- Migration Script: Rename Tables (Final Step)
-- This script renames the old tables and promotes users_new to users
-- WARNING: This is the final step and will make the migration permanent
-- Make sure all previous steps completed successfully before running this

USE db_community;

-- Drop old renamed tables if they exist (from previous migration attempts)
SET FOREIGN_KEY_CHECKS = 0;
DROP TABLE IF EXISTS users_old;
DROP TABLE IF EXISTS admins_old;
DROP TABLE IF EXISTS superadmin_old;
SET FOREIGN_KEY_CHECKS = 1;

-- Rename old users table to users_old (if it exists)
SET @table_exists = (
  SELECT COUNT(*) 
  FROM information_schema.TABLES 
  WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME = 'users'
  AND TABLE_NAME != 'users_new'
);

SET @sql = IF(@table_exists > 0,
  'RENAME TABLE users TO users_old',
  'SELECT "Old users table does not exist, skipping rename" AS message'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Rename old admins table to admins_old (if it exists)
SET @table_exists = (
  SELECT COUNT(*) 
  FROM information_schema.TABLES 
  WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME = 'admins'
);

SET @sql = IF(@table_exists > 0,
  'RENAME TABLE admins TO admins_old',
  'SELECT "Old admins table does not exist, skipping rename" AS message'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Rename old superadmin table to superadmin_old (if it exists)
SET @table_exists = (
  SELECT COUNT(*) 
  FROM information_schema.TABLES 
  WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME = 'superadmin'
);

SET @sql = IF(@table_exists > 0,
  'RENAME TABLE superadmin TO superadmin_old',
  'SELECT "Old superadmin table does not exist, skipping rename" AS message'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Rename users_new to users (this is the final step)
RENAME TABLE users_new TO users;

-- Update foreign key in user_profiles to reference the renamed users table
ALTER TABLE user_profiles 
DROP FOREIGN KEY user_profiles_ibfk_1;

ALTER TABLE user_profiles 
ADD CONSTRAINT user_profiles_user_id_fk 
FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- Update foreign key in admin_sessions
ALTER TABLE admin_sessions 
DROP FOREIGN KEY admin_sessions_user_id_fk;

ALTER TABLE admin_sessions 
ADD CONSTRAINT admin_sessions_user_id_fk 
FOREIGN KEY (admin_id) REFERENCES users(id) ON DELETE CASCADE;

-- Update foreign keys in program_post_act_reports
ALTER TABLE program_post_act_reports 
DROP FOREIGN KEY program_post_act_reports_admin_id_fk;

ALTER TABLE program_post_act_reports 
ADD CONSTRAINT program_post_act_reports_admin_id_fk 
FOREIGN KEY (uploaded_by_admin_id) REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE program_post_act_reports 
DROP FOREIGN KEY program_post_act_reports_superadmin_id_fk;

ALTER TABLE program_post_act_reports 
ADD CONSTRAINT program_post_act_reports_superadmin_id_fk 
FOREIGN KEY (reviewed_by_superadmin_id) REFERENCES users(id) ON DELETE SET NULL;

SELECT 'Tables renamed successfully. Migration complete!' AS status;
SELECT 'Old tables are now: users_old, admins_old, superadmin_old' AS info;
SELECT 'New unified table is: users' AS info;

