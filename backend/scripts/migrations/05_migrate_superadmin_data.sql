-- Migration Script: Migrate Superadmin Data
-- This script migrates data from old superadmin table to new unified table
-- Run this after migrating admins data

USE db_community;

-- Migrate data from old superadmin table (if exists)
-- Superadmin should have id = 1
INSERT INTO users_new (
  id, email, password_hash, role, twofa_enabled, twofa_secret,
  password_changed_at, created_at, updated_at
)
SELECT 
  1 AS id,
  username AS email,  -- username becomes email
  password AS password_hash,  -- password becomes password_hash
  'superadmin' AS role,
  COALESCE(twofa_enabled, 0) AS twofa_enabled,
  twofa_secret,
  password_changed_at,
  created_at,
  updated_at
FROM superadmin
WHERE id = 1
ON DUPLICATE KEY UPDATE
  email = VALUES(email),
  password_hash = VALUES(password_hash),
  role = 'superadmin',
  twofa_enabled = VALUES(twofa_enabled),
  twofa_secret = VALUES(twofa_secret),
  password_changed_at = VALUES(password_changed_at);

SELECT CONCAT('Migrated superadmin (id: ', id, ', email: ', email, ')') AS status
FROM users_new WHERE role = 'superadmin' AND id = 1;

