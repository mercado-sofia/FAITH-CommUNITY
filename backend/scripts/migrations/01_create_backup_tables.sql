-- Migration Script: Create Backup Tables
-- This script creates backup copies of the old tables before migration
-- Run this first to preserve your data

USE db_community;

-- Create backup of old users table (if exists)
CREATE TABLE IF NOT EXISTS users_old_backup AS SELECT * FROM users;

-- Create backup of old admins table (if exists)
CREATE TABLE IF NOT EXISTS admins_old_backup AS SELECT * FROM admins;

-- Create backup of old superadmin table (if exists)
CREATE TABLE IF NOT EXISTS superadmin_old_backup AS SELECT * FROM superadmin;

-- Verify backups were created
SELECT 'Backup tables created successfully' AS status;

