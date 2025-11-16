-- Migration Script: Migrate Admins Data
-- This script migrates data from old admins table to new unified table
-- Run this after migrating users data

USE db_community;

-- Check if admins table has password_hash or password column
SET @has_password_hash = (
  SELECT COUNT(*) 
  FROM information_schema.COLUMNS 
  WHERE TABLE_SCHEMA = DATABASE() 
  AND TABLE_NAME = 'admins' 
  AND COLUMN_NAME = 'password_hash'
);

-- Migrate data from old admins table (if exists)
-- First, try to insert with original IDs (if no conflict)
SET @sql = IF(@has_password_hash > 0,
  'INSERT INTO users_new (
    id, email, password_hash, role, is_active, organization_id,
    password_changed_at, created_at, updated_at
  )
  SELECT 
    a.id,
    a.email,
    a.password_hash,
    ''admin'' AS role,
    COALESCE(a.is_active, 1) AS is_active,
    a.organization_id,
    a.password_changed_at,
    a.created_at,
    a.updated_at
  FROM admins a
  WHERE NOT EXISTS (
    SELECT 1 FROM users_new u WHERE u.id = a.id
  )
  AND NOT EXISTS (
    SELECT 1 FROM users_new u WHERE u.email = a.email
  )',
  'INSERT INTO users_new (
    id, email, password_hash, role, is_active, organization_id,
    password_changed_at, created_at, updated_at
  )
  SELECT 
    a.id,
    a.email,
    a.password AS password_hash,
    ''admin'' AS role,
    COALESCE(a.is_active, 1) AS is_active,
    a.organization_id,
    a.password_changed_at,
    a.created_at,
    a.updated_at
  FROM admins a
  WHERE NOT EXISTS (
    SELECT 1 FROM users_new u WHERE u.id = a.id
  )
  AND NOT EXISTS (
    SELECT 1 FROM users_new u WHERE u.email = a.email
  )'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Handle ID conflicts by inserting without specifying ID (auto-increment)
SET @sql = IF(@has_password_hash > 0,
  'INSERT INTO users_new (
    email, password_hash, role, is_active, organization_id,
    password_changed_at, created_at, updated_at
  )
  SELECT 
    a.email,
    a.password_hash,
    ''admin'' AS role,
    COALESCE(a.is_active, 1) AS is_active,
    a.organization_id,
    a.password_changed_at,
    a.created_at,
    a.updated_at
  FROM admins a
  WHERE NOT EXISTS (
    SELECT 1 FROM users_new u WHERE u.email = a.email
  )
  AND EXISTS (
    SELECT 1 FROM users_new u WHERE u.id = a.id
  )',
  'INSERT INTO users_new (
    email, password_hash, role, is_active, organization_id,
    password_changed_at, created_at, updated_at
  )
  SELECT 
    a.email,
    a.password AS password_hash,
    ''admin'' AS role,
    COALESCE(a.is_active, 1) AS is_active,
    a.organization_id,
    a.password_changed_at,
    a.created_at,
    a.updated_at
  FROM admins a
  WHERE NOT EXISTS (
    SELECT 1 FROM users_new u WHERE u.email = a.email
  )
  AND EXISTS (
    SELECT 1 FROM users_new u WHERE u.id = a.id
  )'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SELECT CONCAT('Migrated ', COUNT(*), ' admins from old admins table') AS status
FROM users_new WHERE role = 'admin';

