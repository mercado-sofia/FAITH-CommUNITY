-- Migration Script: Update Foreign Key References
-- This script updates foreign keys to reference the new unified users table
-- Run this after migrating all user data

USE db_community;

-- Update admin_sessions table foreign key
-- First, clean up orphaned sessions (sessions for admins that don't exist in users_new)
DELETE FROM admin_sessions 
WHERE admin_id NOT IN (SELECT id FROM users_new);

-- Drop old foreign key if it exists (ignore error if it doesn't)
SET @drop_fk = (
  SELECT CONCAT('ALTER TABLE admin_sessions DROP FOREIGN KEY ', CONSTRAINT_NAME)
  FROM information_schema.TABLE_CONSTRAINTS 
  WHERE CONSTRAINT_SCHEMA = DATABASE()
  AND TABLE_NAME = 'admin_sessions'
  AND CONSTRAINT_NAME = 'admin_sessions_ibfk_1'
  LIMIT 1
);

SET @sql = IFNULL(@drop_fk, 'SELECT "No old foreign key to drop" AS message');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add new foreign key to users table (ignore error if it already exists)
SET @add_fk = 'ALTER TABLE admin_sessions ADD CONSTRAINT admin_sessions_user_id_fk FOREIGN KEY (admin_id) REFERENCES users_new(id) ON DELETE CASCADE';
SET @fk_exists = (
  SELECT COUNT(*) 
  FROM information_schema.TABLE_CONSTRAINTS 
  WHERE CONSTRAINT_SCHEMA = DATABASE()
  AND TABLE_NAME = 'admin_sessions'
  AND CONSTRAINT_NAME = 'admin_sessions_user_id_fk'
);

SET @sql = IF(@fk_exists = 0, @add_fk, 'SELECT "Foreign key already exists, skipping" AS message');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Update program_post_act_reports table foreign keys
-- First, clean up orphaned records
UPDATE program_post_act_reports 
SET uploaded_by_admin_id = NULL 
WHERE uploaded_by_admin_id IS NOT NULL 
AND uploaded_by_admin_id NOT IN (SELECT id FROM users_new);

UPDATE program_post_act_reports 
SET reviewed_by_superadmin_id = NULL 
WHERE reviewed_by_superadmin_id IS NOT NULL 
AND reviewed_by_superadmin_id NOT IN (SELECT id FROM users_new);

-- Drop old foreign keys if they exist
SET @drop_fk = (
  SELECT CONCAT('ALTER TABLE program_post_act_reports DROP FOREIGN KEY ', CONSTRAINT_NAME)
  FROM information_schema.TABLE_CONSTRAINTS 
  WHERE CONSTRAINT_SCHEMA = DATABASE()
  AND TABLE_NAME = 'program_post_act_reports'
  AND CONSTRAINT_NAME LIKE '%admin_id%'
  LIMIT 1
);

SET @sql = IFNULL(@drop_fk, 'SELECT "No old foreign keys to drop" AS message');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add foreign key for uploaded_by_admin_id (if it doesn't exist)
SET @fk_exists = (
  SELECT COUNT(*) 
  FROM information_schema.TABLE_CONSTRAINTS 
  WHERE CONSTRAINT_SCHEMA = DATABASE()
  AND TABLE_NAME = 'program_post_act_reports'
  AND CONSTRAINT_NAME = 'program_post_act_reports_admin_id_fk'
);

SET @sql = IF(@fk_exists = 0, 
  'ALTER TABLE program_post_act_reports ADD CONSTRAINT program_post_act_reports_admin_id_fk FOREIGN KEY (uploaded_by_admin_id) REFERENCES users_new(id) ON DELETE SET NULL',
  'SELECT "Foreign key already exists, skipping" AS message'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add foreign key for reviewed_by_superadmin_id (if it doesn't exist)
SET @fk_exists = (
  SELECT COUNT(*) 
  FROM information_schema.TABLE_CONSTRAINTS 
  WHERE CONSTRAINT_SCHEMA = DATABASE()
  AND TABLE_NAME = 'program_post_act_reports'
  AND CONSTRAINT_NAME = 'program_post_act_reports_superadmin_id_fk'
);

SET @sql = IF(@fk_exists = 0,
  'ALTER TABLE program_post_act_reports ADD CONSTRAINT program_post_act_reports_superadmin_id_fk FOREIGN KEY (reviewed_by_superadmin_id) REFERENCES users_new(id) ON DELETE SET NULL',
  'SELECT "Foreign key already exists, skipping" AS message'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Update step_up_challenges table foreign key (if exists)
SET @table_exists = (
  SELECT COUNT(*) 
  FROM information_schema.TABLES 
  WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME = 'step_up_challenges'
);

SET @sql = IF(@table_exists > 0,
  'ALTER TABLE step_up_challenges ADD CONSTRAINT step_up_challenges_user_id_fk FOREIGN KEY (admin_id) REFERENCES users_new(id) ON DELETE CASCADE',
  'SELECT "step_up_challenges table does not exist, skipping" AS message'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Update mfa_backup_codes table foreign key (if exists)
SET @table_exists = (
  SELECT COUNT(*) 
  FROM information_schema.TABLES 
  WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME = 'mfa_backup_codes'
);

SET @sql = IF(@table_exists > 0,
  'ALTER TABLE mfa_backup_codes ADD CONSTRAINT mfa_backup_codes_user_id_fk FOREIGN KEY (admin_id) REFERENCES users_new(id) ON DELETE CASCADE',
  'SELECT "mfa_backup_codes table does not exist, skipping" AS message'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SELECT 'Foreign keys updated successfully' AS status;
