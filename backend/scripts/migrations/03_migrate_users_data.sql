-- Migration Script: Migrate Users Data
-- This script migrates data from old users table to new unified table
-- Run this after creating the unified users table

USE db_community;

-- Migrate data from old users table (if exists)
INSERT INTO users_new (
  id, email, password_hash, role, is_active, email_verified, 
  last_login, verification_token, verification_token_expires,
  created_at, updated_at
)
SELECT 
  id, 
  email, 
  password_hash, 
  'user' AS role,
  COALESCE(is_active, 1) AS is_active,
  COALESCE(email_verified, 0) AS email_verified,
  last_login,
  verification_token,
  verification_token_expires,
  created_at,
  updated_at
FROM users
WHERE NOT EXISTS (
  SELECT 1 FROM users_new WHERE users_new.id = users.id
);

-- Migrate user profile data to user_profiles table (if profile columns exist in old users table)
-- Check if profile columns exist before migrating
SET @has_first_name = (
  SELECT COUNT(*) 
  FROM information_schema.COLUMNS 
  WHERE TABLE_SCHEMA = DATABASE() 
  AND TABLE_NAME = 'users' 
  AND COLUMN_NAME = 'first_name'
);

SET @sql = IF(@has_first_name > 0,
  'INSERT INTO user_profiles (
    user_id, first_name, last_name, contact_number, gender, 
    address, birth_date, occupation, citizenship, profile_photo_url,
    newsletter_subscribed, created_at, updated_at
  )
  SELECT 
    id AS user_id,
    first_name,
    last_name,
    contact_number,
    gender,
    address,
    birth_date,
    occupation,
    citizenship,
    profile_photo_url,
    COALESCE(newsletter_subscribed, 0) AS newsletter_subscribed,
    created_at,
    updated_at
  FROM users
  WHERE NOT EXISTS (
    SELECT 1 FROM user_profiles WHERE user_profiles.user_id = users.id
  )
  AND first_name IS NOT NULL 
  AND last_name IS NOT NULL',
  'SELECT "Old users table does not have profile columns, skipping profile migration" AS message'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SELECT CONCAT('Migrated ', COUNT(*), ' users from old users table') AS status
FROM users_new WHERE role = 'user';

