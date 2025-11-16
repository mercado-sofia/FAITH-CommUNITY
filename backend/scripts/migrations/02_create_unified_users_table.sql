-- Migration Script: Create Unified Users Table
-- This script creates the new unified users table structure
-- Run this after creating backup tables

USE db_community;

-- Drop users_new table if it exists (from previous failed migration)
-- Disable foreign key checks temporarily to allow dropping
SET FOREIGN_KEY_CHECKS = 0;

-- Drop user_profiles first (it references users_new)
DROP TABLE IF EXISTS user_profiles;

-- Drop users_new table
DROP TABLE IF EXISTS users_new;

-- Re-enable foreign key checks
SET FOREIGN_KEY_CHECKS = 1;

-- Create new unified users table
CREATE TABLE users_new (
  id INT AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('user', 'admin', 'superadmin') NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  email_verified BOOLEAN DEFAULT FALSE,
  last_login TIMESTAMP NULL,
  password_changed_at TIMESTAMP NULL,
  verification_token VARCHAR(255) NULL,
  verification_token_expires TIMESTAMP NULL,
  organization_id INT NULL,
  twofa_enabled BOOLEAN DEFAULT FALSE,
  twofa_secret VARCHAR(255) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE SET NULL,
  INDEX idx_email (email),
  INDEX idx_role (role),
  INDEX idx_organization_id (organization_id),
  INDEX idx_is_active (is_active),
  INDEX idx_email_verified (email_verified),
  INDEX idx_verification_token (verification_token),
  INDEX idx_created_at (created_at),
  CONSTRAINT chk_admin_organization CHECK (
    (role = 'admin' AND organization_id IS NOT NULL) OR (role != 'admin')
  )
);

-- Create user_profiles table for public user-specific data
CREATE TABLE IF NOT EXISTS user_profiles (
  user_id INT PRIMARY KEY,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  full_name VARCHAR(200) GENERATED ALWAYS AS (CONCAT(first_name, ' ', last_name)) STORED,
  contact_number VARCHAR(20) NOT NULL,
  gender ENUM('Male', 'Female', 'Other') NOT NULL,
  address TEXT NOT NULL,
  birth_date DATE NOT NULL,
  occupation VARCHAR(255) NULL,
  citizenship VARCHAR(100) NULL,
  profile_photo_url VARCHAR(500) NULL,
  newsletter_subscribed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users_new(id) ON DELETE CASCADE,
  INDEX idx_full_name (full_name)
);

SELECT 'Unified users table and user_profiles table created successfully' AS status;

