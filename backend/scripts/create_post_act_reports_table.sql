-- Migration script to create program_post_act_reports table
-- This table stores Post Act Reports submitted by admins for programs

CREATE TABLE IF NOT EXISTS program_post_act_reports (
  id INT AUTO_INCREMENT PRIMARY KEY,
  program_id INT NOT NULL,
  file_public_id VARCHAR(255) NOT NULL,
  file_url VARCHAR(500) NOT NULL,
  status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
  uploaded_by_admin_id INT NULL,
  reviewed_by_superadmin_id INT NULL,
  reviewed_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (program_id) REFERENCES programs_projects(id) ON DELETE CASCADE,
  FOREIGN KEY (uploaded_by_admin_id) REFERENCES admins(id) ON DELETE SET NULL,
  INDEX idx_program_id (program_id),
  INDEX idx_status (status),
  INDEX idx_uploaded_by (uploaded_by_admin_id),
  INDEX idx_reviewed_by (reviewed_by_superadmin_id),
  INDEX idx_created_at (created_at)
);

