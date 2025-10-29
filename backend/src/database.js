import mysql from "mysql2";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { logError, logInfo } from "./utils/logger.js";

// Get the directory name properly in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from the correct location
dotenv.config({ path: path.join(__dirname, '../../.env') });

const dbConfig = {
  host: process.env.MYSQL_HOST || "localhost",
  user: process.env.MYSQL_USER || "root",
  password: process.env.MYSQL_PASSWORD || "",
  database: process.env.MYSQL_DATABASE || "db_community",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  multipleStatements: true,
  typeCast: function (field, next) {
    if (field.type === 'JSON') {
      return JSON.parse(field.string());
    }
    return next();
  }
};

// Create a connection pool
const pool = mysql.createPool(dbConfig);
const promisePool = pool.promise();

// Incremental migrations for existing databases
const runIncrementalMigrations = async (connection) => {
  try {


    // Migrate existing news data
    await connection.query(`
      UPDATE news 
      SET slug = LOWER(REPLACE(REPLACE(REPLACE(REPLACE(title, ' ', '-'), '&', 'and'), '?', ''), '!', ''))
      WHERE slug IS NULL OR slug = ''
    `);
    
    // Generate excerpt from content
    await connection.query(`
      UPDATE news 
      SET excerpt = CASE 
          WHEN LENGTH(content) > 180 
          THEN CONCAT(LEFT(content, 177), '...')
          ELSE content
      END
      WHERE excerpt IS NULL OR excerpt = ''
    `);
    
    await connection.query(`
      UPDATE news 
      SET published_at = COALESCE(date, created_at)
      WHERE published_at IS NULL
    `);


    // Generate slugs for existing programs
    const [existingPrograms] = await connection.query(`
      SELECT id, title FROM programs_projects WHERE slug IS NULL
    `);
    
    for (const program of existingPrograms) {
      const slug = program.title
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .trim('-');
      
      let finalSlug = slug;
      let counter = 1;
      while (true) {
        const [existingSlug] = await connection.query(`
          SELECT id FROM programs_projects WHERE slug = ? AND id != ?
        `, [finalSlug, program.id]);
        
        if (existingSlug.length === 0) {
          break;
        }
        finalSlug = `${slug}-${counter}`;
        counter++;
      }
      
      await connection.query(`
        UPDATE programs_projects SET slug = ? WHERE id = ?
      `, [finalSlug, program.id]);
    }


    // Link existing messages with users based on email
    await connection.query(`
      UPDATE messages m 
      JOIN users u ON m.sender_email = u.email 
      SET m.user_id = u.id 
      WHERE m.user_id IS NULL
    `);

    // Fix any incorrectly verified subscriptions
    await connection.query(`
      UPDATE subscribers 
      SET is_verified = 0 
      WHERE is_verified = 1 AND verified_at IS NULL
    `);


    // Update superadmin_notifications message_template
    await connection.query(`
      UPDATE superadmin_notifications 
      SET message_template = message
      WHERE message_template IS NULL
    `);

    // Handle superadmin password column migration
    const [oldPasswordHashColumn] = await connection.query(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'superadmin' 
      AND COLUMN_NAME = 'password_hash'
    `);
    
    if (oldPasswordHashColumn.length > 0) {
      // Copy data from password_hash to password
      await connection.query(`UPDATE superadmin SET password = password_hash WHERE password_hash IS NOT NULL`);
      
      // Drop the old password_hash column
      await connection.query(`ALTER TABLE superadmin DROP COLUMN password_hash`);
    }

    // Handle admins table password column migration
    const [adminsColumns] = await connection.query(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'admins' 
      AND TABLE_SCHEMA = DATABASE()
    `);
    
    const hasPassword = adminsColumns.some(col => col.COLUMN_NAME === 'password');
    const hasPasswordHash = adminsColumns.some(col => col.COLUMN_NAME === 'password_hash');
    const hasRole = adminsColumns.some(col => col.COLUMN_NAME === 'role');
    
    if (hasPasswordHash && !hasPassword) {
      // Copy data from password_hash to password
      await connection.query(`UPDATE admins SET password = password_hash WHERE password_hash IS NOT NULL`);
      
      // Drop the old password_hash column
      await connection.query(`ALTER TABLE admins DROP COLUMN password_hash`);
    }

    // Remove role column from admins table if it exists
    if (hasRole) {
      await connection.query(`ALTER TABLE admins DROP COLUMN role`);
    }

    // Handle login_attempts table schema migration
    const [oldColumns] = await connection.query(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'login_attempts' 
      AND COLUMN_NAME = 'email'
    `);
    
    if (oldColumns.length > 0) {
      // Drop the old table and recreate with new schema
      await connection.query(`DROP TABLE IF EXISTS login_attempts`);
      await connection.query(`
        CREATE TABLE login_attempts (
          id INT AUTO_INCREMENT PRIMARY KEY,
          identifier VARCHAR(255) NOT NULL,
          ip_address VARCHAR(45) NULL,
          attempt_type ENUM('failed', 'success') NOT NULL,
          user_type ENUM('user', 'admin', 'superadmin') NOT NULL DEFAULT 'user',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          INDEX idx_identifier (identifier),
          INDEX idx_ip (ip_address),
          INDEX idx_created (created_at),
          INDEX idx_user_type (user_type),
          INDEX idx_combined (identifier, ip_address, user_type, attempt_type)
        )
      `);
    }


    // Update about_us extension_categories with proper structure
    const [aboutUsRows] = await connection.query(`
      SELECT id, extension_categories 
      FROM about_us 
      WHERE extension_categories IS NOT NULL
    `);
    
    if (aboutUsRows.length > 0) {
      for (const row of aboutUsRows) {
        const categories = JSON.parse(row.extension_categories);
        const needsUpdate = categories.some(cat => !cat.icon);
        
        if (needsUpdate) {
          const updatedCategories = [
            {"name": "Extension For Education", "icon": "education", "color": "green"},
            {"name": "Extension For Medical", "icon": "medical", "color": "red"},
            {"name": "Extension For Community", "icon": "community", "color": "orange"},
            {"name": "Extension For Foods", "icon": "food", "color": "green"}
          ];
          
          await connection.query(`
            UPDATE about_us 
            SET extension_categories = ? 
            WHERE id = ?
          `, [JSON.stringify(updatedCategories), row.id]);
        }
      }
    }



    // Handle security_logs event_type to action column migration
    const [securityLogsColumns] = await connection.query(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'security_logs' 
      AND TABLE_SCHEMA = DATABASE()
      AND COLUMN_NAME IN ('event_type', 'action')
    `);
    
    const hasEventType = securityLogsColumns.some(col => col.COLUMN_NAME === 'event_type');
    const hasAction = securityLogsColumns.some(col => col.COLUMN_NAME === 'action');
    
    if (hasEventType && !hasAction) {
      // Rename event_type column to action
      await connection.query(`ALTER TABLE security_logs CHANGE COLUMN event_type action VARCHAR(100) NOT NULL`);
      await connection.query(`ALTER TABLE security_logs DROP INDEX idx_event_type`);
      await connection.query(`ALTER TABLE security_logs ADD INDEX idx_action (action)`);
    }

    // Handle submissions comment_reject to rejection_reason column migration
    const [submissionsColumns] = await connection.query(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'submissions' 
      AND TABLE_SCHEMA = DATABASE()
      AND COLUMN_NAME IN ('comment_reject', 'rejection_reason')
    `);
    
    const hasCommentReject = submissionsColumns.some(col => col.COLUMN_NAME === 'comment_reject');
    const hasRejectionReason = submissionsColumns.some(col => col.COLUMN_NAME === 'rejection_reason');
    
    if (hasCommentReject && !hasRejectionReason) {
      // Rename comment_reject column to rejection_reason
      await connection.query(`ALTER TABLE submissions CHANGE COLUMN comment_reject rejection_reason TEXT`);
    }

    // Update admin_notifications type enum to include new notification types
    try {
      await connection.query(`
        ALTER TABLE admin_notifications 
        MODIFY COLUMN type ENUM('approval', 'decline', 'system', 'message', 'collaboration', 'program_approval', 'program_declined', 'collaboration_request', 'collaboration_accepted') NOT NULL
      `);
    } catch (enumError) {
      // If the enum update fails, it might already be updated or there might be existing data
      console.log('Admin notifications enum update skipped (may already be updated)');
    }

    // Update programs_projects status enum to only include program lifecycle statuses
    try {
      await connection.query(`
        ALTER TABLE programs_projects 
        MODIFY COLUMN status ENUM('Upcoming', 'Active', 'Completed', 'Cancelled') DEFAULT 'Upcoming'
      `);
      // Programs status enum updated successfully
    } catch (enumError) {
      // If the enum update fails, it might already be updated or there might be existing data
      console.log('Programs status enum update skipped (may already be updated)');
    }

    // manual_status_override field is already included in the initial table creation
    // No need to add it in migrations as it's part of the base schema

  } catch (error) {
    logError('Incremental migrations failed', error, { context: 'database' });
    throw error;
  }
};

// Initialize database function
const initializeDatabase = async () => {
  const connection = await promisePool.getConnection();

  try {

    // Create migrations table if it doesn't exist
    await connection.query(`
      CREATE TABLE IF NOT EXISTS migrations (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL UNIQUE,
        executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_name (name)
      )
    `);

    // Check if migrations have been executed
    const [executedMigrations] = await connection.query(
      'SELECT name FROM migrations WHERE name = "database_initialized"'
    );

    if (executedMigrations.length === 0) {

      // 1. Core Tables
      await connection.query(`
        CREATE TABLE IF NOT EXISTS organizations (
          id INT AUTO_INCREMENT PRIMARY KEY,
          org VARCHAR(50) NULL UNIQUE,
          orgName VARCHAR(255) NULL,
          logo VARCHAR(500) NULL,
          facebook VARCHAR(500) NULL,
          description TEXT NULL,
          org_color VARCHAR(7) DEFAULT '#444444',
          status ENUM('ACTIVE', 'INACTIVE') DEFAULT 'ACTIVE',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          INDEX idx_org (org),
          INDEX idx_orgName (orgName)
        )
      `);

      await connection.query(`
        CREATE TABLE IF NOT EXISTS users (
          id INT AUTO_INCREMENT PRIMARY KEY,
          first_name VARCHAR(100) NOT NULL,
          last_name VARCHAR(100) NOT NULL,
          full_name VARCHAR(200) GENERATED ALWAYS AS (CONCAT(first_name, ' ', last_name)) STORED,
          email VARCHAR(255) NOT NULL UNIQUE,
          password_hash VARCHAR(255) NOT NULL,
          contact_number VARCHAR(20) NOT NULL,
          gender ENUM('Male', 'Female', 'Other') NOT NULL,
          address TEXT NOT NULL,
          birth_date DATE NOT NULL,
          occupation VARCHAR(255),
          citizenship VARCHAR(100),
          profile_photo_url VARCHAR(500),
          newsletter_subscribed TINYINT(1) DEFAULT 0,
          is_active TINYINT(1) DEFAULT 1,
          email_verified TINYINT(1) DEFAULT 0,
          verification_token VARCHAR(255) NULL,
          verification_token_expires TIMESTAMP NULL,
          last_login TIMESTAMP NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          INDEX idx_email (email),
          INDEX idx_created_at (created_at),
          INDEX idx_verification_token (verification_token),
          INDEX idx_email_verified (email_verified),
          INDEX idx_is_active (is_active)
        )
      `);

      await connection.query(`
        CREATE TABLE IF NOT EXISTS admins (
          id INT AUTO_INCREMENT PRIMARY KEY,
          email VARCHAR(255) NOT NULL UNIQUE,
          password VARCHAR(255) NOT NULL,
          organization_id INT NULL,
          is_active BOOLEAN DEFAULT TRUE,
          password_changed_at TIMESTAMP NULL DEFAULT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
          FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE SET NULL,
          INDEX idx_email (email),
          INDEX idx_organization_id (organization_id),
          INDEX idx_is_active (is_active)
        )
      `);

      await connection.query(`
        CREATE TABLE IF NOT EXISTS programs_projects (
          id INT AUTO_INCREMENT PRIMARY KEY,
          organization_id INT NOT NULL,
          title VARCHAR(255) NOT NULL,
          slug VARCHAR(255) UNIQUE,
          description TEXT NOT NULL,
          category VARCHAR(100),
          status ENUM('Upcoming', 'Active', 'Completed', 'Cancelled') DEFAULT 'Upcoming',
          image VARCHAR(500),
          event_start_date DATE NULL,
          event_end_date DATE NULL,
          date_completed DATE NULL,
          is_featured BOOLEAN DEFAULT FALSE,
          is_approved BOOLEAN DEFAULT FALSE, // SECURITY FIX: Require explicit approval
          is_collaborative BOOLEAN DEFAULT FALSE,
          accepts_volunteers BOOLEAN DEFAULT TRUE, // Controls whether program accepts volunteer applications
          manual_status_override BOOLEAN DEFAULT FALSE, // Indicates if admin manually set the status
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
          INDEX idx_programs_slug (slug),
          INDEX idx_programs_organization (organization_id),
          INDEX idx_programs_status (status),
          INDEX idx_programs_featured (is_featured),
          INDEX idx_programs_approved (is_approved),
          INDEX idx_programs_accepts_volunteers (accepts_volunteers),
          INDEX idx_programs_manual_override (manual_status_override)
        )
      `);

      await connection.query(`
        CREATE TABLE IF NOT EXISTS news (
          id INT AUTO_INCREMENT PRIMARY KEY,
          organization_id INT NOT NULL,
          title VARCHAR(255) NOT NULL,
          slug VARCHAR(255) UNIQUE,
          content LONGTEXT,
          excerpt TEXT,
          featured_image VARCHAR(500),
          date DATE,
          published_at DATETIME,
          is_deleted BOOLEAN DEFAULT FALSE,
          deleted_at TIMESTAMP NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
          FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
          INDEX idx_news_slug (slug),
          INDEX idx_news_published_at (published_at),
          INDEX idx_news_organization (organization_id),
          INDEX idx_news_created_at (created_at)
        )
      `);

      // 2. Workflow Tables
      await connection.query(`
        CREATE TABLE IF NOT EXISTS submissions (
          id INT AUTO_INCREMENT PRIMARY KEY,
          organization_id INT NOT NULL,
          section VARCHAR(50) NOT NULL,
          previous_data JSON,
          proposed_data JSON NOT NULL,
          submitted_by INT NOT NULL,
          status ENUM('pending', 'approved', 'rejected', 'approved_pending_collaboration') DEFAULT 'pending',
          rejection_reason TEXT,
          submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
          FOREIGN KEY (submitted_by) REFERENCES admins(id) ON DELETE CASCADE,
          INDEX idx_organization_status (organization_id, status),
          INDEX idx_submitted_by (submitted_by),
          INDEX idx_section (section)
        )
      `);

      await connection.query(`
        CREATE TABLE IF NOT EXISTS admin_notifications (
          id INT AUTO_INCREMENT PRIMARY KEY,
          admin_id INT NOT NULL,
          type ENUM('approval', 'decline', 'system', 'message', 'collaboration', 'program_approval', 'program_declined', 'collaboration_request', 'collaboration_accepted') NOT NULL,
          title VARCHAR(255) NOT NULL,
          message TEXT NOT NULL,
          section VARCHAR(100),
          submission_id INT,
          is_read BOOLEAN DEFAULT FALSE,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          FOREIGN KEY (admin_id) REFERENCES admins(id) ON DELETE CASCADE,
          INDEX idx_admin_read (admin_id, is_read),
          INDEX idx_created_at (created_at)
        )
      `);

        await connection.query(`
        CREATE TABLE IF NOT EXISTS superadmin_notifications (
          id INT AUTO_INCREMENT PRIMARY KEY,
          superadmin_id INT NOT NULL,
          type ENUM('approval_request', 'decline', 'system', 'message') NOT NULL,
          title VARCHAR(255) NOT NULL,
          message TEXT NOT NULL,
          message_template TEXT,
          section VARCHAR(100),
          submission_id INT,
          organization_id INT,
          is_read TINYINT(1) DEFAULT 0,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE SET NULL,
          INDEX idx_superadmin_read (superadmin_id, is_read),
          INDEX idx_created_at (created_at),
          INDEX idx_organization (organization_id)
        )
      `);

        await connection.query(`
        CREATE TABLE IF NOT EXISTS user_notifications (
          id INT AUTO_INCREMENT PRIMARY KEY,
          user_id INT NOT NULL,
          type VARCHAR(50) NOT NULL,
          title VARCHAR(255) NOT NULL,
          message TEXT NOT NULL,
          is_read TINYINT(1) DEFAULT 0,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
          INDEX idx_user_id (user_id),
          INDEX idx_is_read (is_read),
          INDEX idx_created_at (created_at)
        )
      `);

        await connection.query(`
        CREATE TABLE IF NOT EXISTS admin_invitations (
          id INT AUTO_INCREMENT PRIMARY KEY,
          email VARCHAR(255) NOT NULL,
          token VARCHAR(255) NOT NULL UNIQUE,
          status ENUM('pending', 'accepted', 'expired') DEFAULT 'pending',
          expires_at TIMESTAMP NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          accepted_at TIMESTAMP NULL,
          INDEX idx_email (email),
          INDEX idx_token (token),
          INDEX idx_status (status),
          INDEX idx_expires_at (expires_at)
        )
      `);

      // 3. Feature Tables
      await connection.query(`
        CREATE TABLE IF NOT EXISTS volunteers (
          id INT AUTO_INCREMENT PRIMARY KEY,
          user_id INT NOT NULL,
          program_id INT NOT NULL,
          reason TEXT NOT NULL,
          status ENUM('Pending', 'Approved', 'Declined', 'Cancelled', 'Completed') DEFAULT 'Pending',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
          FOREIGN KEY (program_id) REFERENCES programs_projects(id) ON DELETE CASCADE,
          INDEX idx_user_id (user_id),
          INDEX idx_program_id (program_id),
          INDEX idx_status (status),
          INDEX idx_created_at (created_at)
        )
      `);

        await connection.query(`
        CREATE TABLE IF NOT EXISTS messages (
            id INT AUTO_INCREMENT PRIMARY KEY,
          organization_id INT NOT NULL,
          user_id INT NULL,
          sender_email VARCHAR(255) NOT NULL,
          message TEXT NOT NULL,
          is_read BOOLEAN DEFAULT FALSE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
          INDEX idx_organization_id (organization_id),
            INDEX idx_user_id (user_id),
          INDEX idx_created_at (created_at),
          INDEX idx_is_read (is_read)
        )
      `);

        await connection.query(`
        CREATE TABLE IF NOT EXISTS subscribers (
            id INT AUTO_INCREMENT PRIMARY KEY,
            email VARCHAR(255) NOT NULL UNIQUE,
            verify_token VARCHAR(255) NOT NULL,
            unsubscribe_token VARCHAR(255) NOT NULL,
            is_verified TINYINT(1) DEFAULT 0,
            verify_expires TIMESTAMP NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            verified_at TIMESTAMP NULL,
            INDEX idx_email (email),
            INDEX idx_verify_token (verify_token),
            INDEX idx_unsubscribe_token (unsubscribe_token),
            INDEX idx_is_verified (is_verified),
            INDEX idx_verify_expires (verify_expires)
          )
        `);

          await connection.query(`
        CREATE TABLE IF NOT EXISTS faqs (
          id INT AUTO_INCREMENT PRIMARY KEY,
          question TEXT NOT NULL,
          answer TEXT NOT NULL,
          status ENUM('active', 'inactive') DEFAULT 'active',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        )
      `);

          await connection.query(`
        CREATE TABLE IF NOT EXISTS program_collaborations (
          id INT AUTO_INCREMENT PRIMARY KEY,
          program_id INT NULL,
          submission_id INT NULL,
          collaborator_admin_id INT NOT NULL,
          invited_by_admin_id INT NOT NULL,
          status ENUM('pending', 'accepted', 'declined') DEFAULT 'pending',
          program_title VARCHAR(255) NULL,
          invited_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          responded_at TIMESTAMP NULL,
          FOREIGN KEY (program_id) REFERENCES programs_projects(id) ON DELETE CASCADE,
          FOREIGN KEY (submission_id) REFERENCES submissions(id) ON DELETE CASCADE,
          FOREIGN KEY (collaborator_admin_id) REFERENCES admins(id) ON DELETE CASCADE,
          FOREIGN KEY (invited_by_admin_id) REFERENCES admins(id) ON DELETE CASCADE,
          UNIQUE KEY unique_program_collaborator (program_id, collaborator_admin_id),
          UNIQUE KEY unique_submission_collaborator (submission_id, collaborator_admin_id),
          INDEX idx_collaborator_status (collaborator_admin_id, status),
          INDEX idx_program_status (program_id, status),
          INDEX idx_submission_status (submission_id, status)
        )
      `);

          await connection.query(`
        CREATE TABLE IF NOT EXISTS program_event_dates (
          id INT AUTO_INCREMENT PRIMARY KEY,
          program_id INT NOT NULL,
          event_date DATE NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          FOREIGN KEY (program_id) REFERENCES programs_projects(id) ON DELETE CASCADE,
          UNIQUE KEY unique_program_date (program_id, event_date)
        )
      `);

          await connection.query(`
        CREATE TABLE IF NOT EXISTS program_additional_images (
          id INT AUTO_INCREMENT PRIMARY KEY,
          program_id INT NOT NULL,
          image_data LONGTEXT NOT NULL,
          image_order INT DEFAULT 0,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (program_id) REFERENCES programs_projects(id) ON DELETE CASCADE
        )
      `);

      // 4. Content Tables
          await connection.query(`
        CREATE TABLE IF NOT EXISTS advocacies (
          id INT AUTO_INCREMENT PRIMARY KEY,
          organization_id INT NOT NULL,
          advocacy TEXT NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
          INDEX idx_organization_id (organization_id)
        )
      `);

      await connection.query(`
        CREATE TABLE IF NOT EXISTS competencies (
          id INT AUTO_INCREMENT PRIMARY KEY,
          organization_id INT NOT NULL,
          competency TEXT NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
          INDEX idx_organization_id (organization_id)
        )
      `);

      await connection.query(`
        CREATE TABLE IF NOT EXISTS organization_heads (
          id INT AUTO_INCREMENT PRIMARY KEY,
          organization_id INT NOT NULL,
          head_name VARCHAR(255) NOT NULL,
          role VARCHAR(100) NOT NULL,
          priority INT DEFAULT 999,
          display_order INT DEFAULT 999,
          facebook VARCHAR(500),
          email VARCHAR(255),
          photo VARCHAR(500),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
          INDEX idx_organization_id (organization_id),
          INDEX idx_priority (priority),
          INDEX idx_display_order (display_order)
        )
      `);

      await connection.query(`
        CREATE TABLE IF NOT EXISTS heads_faces (
          id INT AUTO_INCREMENT PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          description TEXT,
          image_url VARCHAR(500),
          position VARCHAR(100) DEFAULT 'Head of FACES',
          status ENUM('ACTIVE', 'INACTIVE') DEFAULT 'ACTIVE',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        )
      `);

      await connection.query(`
        CREATE TABLE IF NOT EXISTS admin_highlights (
          id INT AUTO_INCREMENT PRIMARY KEY,
          title VARCHAR(255) NOT NULL,
          description TEXT NOT NULL,
          media_files JSON,
          organization_id INT NOT NULL,
          created_by INT NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
          FOREIGN KEY (created_by) REFERENCES admins(id) ON DELETE CASCADE,
          INDEX idx_organization_id (organization_id),
          INDEX idx_created_by (created_by),
          INDEX idx_created_at (created_at)
        )
      `);

      // 5. UI Tables
      await connection.query(`
        CREATE TABLE IF NOT EXISTS branding (
          id INT AUTO_INCREMENT PRIMARY KEY,
          logo_url VARCHAR(500) NULL,
          name_url VARCHAR(500) NULL,
          favicon_url VARCHAR(500) NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        )
      `);
      
      await connection.query(`
        CREATE TABLE IF NOT EXISTS site_name (
          id INT AUTO_INCREMENT PRIMARY KEY,
          site_name VARCHAR(255) NOT NULL DEFAULT 'FAITH CommUNITY',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        )
      `);
      
      await connection.query(`
        CREATE TABLE IF NOT EXISTS footer_content (
          id INT AUTO_INCREMENT PRIMARY KEY,
          section_type ENUM('contact', 'quick_links', 'services', 'social_media', 'copyright') NOT NULL,
          title VARCHAR(255) NOT NULL,
          content TEXT NULL,
          url VARCHAR(500) NULL,
          icon VARCHAR(100) NULL,
          display_order INT DEFAULT 1,
          is_active TINYINT(1) DEFAULT 1,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          INDEX idx_section_type (section_type),
          INDEX idx_is_active (is_active),
          INDEX idx_display_order (display_order)
        )
      `);
      
      await connection.query(`
        CREATE TABLE IF NOT EXISTS hero_section (
          id INT AUTO_INCREMENT PRIMARY KEY,
          tag VARCHAR(255) DEFAULT 'Welcome to FAITH CommUNITY',
          heading TEXT DEFAULT 'A Unified Platform for Community Extension Programs',
          video_url VARCHAR(500) NULL,
          video_link VARCHAR(500) NULL,
          video_type ENUM('upload', 'link') DEFAULT 'upload',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        )
      `);
      
      await connection.query(`
        CREATE TABLE IF NOT EXISTS hero_section_images (
          id INT AUTO_INCREMENT PRIMARY KEY,
          image_id INT NOT NULL,
          image_url VARCHAR(500) NULL,
          heading VARCHAR(255) DEFAULT 'Image Heading',
          subheading VARCHAR(255) DEFAULT 'Image Subheading',
          display_order INT DEFAULT 1,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          UNIQUE KEY unique_image_id (image_id),
          INDEX idx_display_order (display_order)
        )
      `);
      
      await connection.query(`
        CREATE TABLE IF NOT EXISTS about_us (
          id INT AUTO_INCREMENT PRIMARY KEY,
          heading TEXT DEFAULT NULL,
          description TEXT DEFAULT NULL,
          extension_categories JSON DEFAULT '[
            {"name": "Extension For Education", "icon": "education", "color": "green"},
            {"name": "Extension For Medical", "icon": "medical", "color": "red"},
            {"name": "Extension For Community", "icon": "community", "color": "orange"},
            {"name": "Extension For Foods", "icon": "food", "color": "green"}
          ]',
          image_url VARCHAR(500) DEFAULT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        )
      `);

      await connection.query(`
        CREATE TABLE IF NOT EXISTS mission_vision (
          id INT AUTO_INCREMENT PRIMARY KEY,
          type ENUM('mission', 'vision') NOT NULL,
          content TEXT NOT NULL,
          status ENUM('ACTIVE', 'INACTIVE') DEFAULT 'ACTIVE',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          INDEX idx_type (type),
          INDEX idx_status (status)
        )
      `);
      
      // 6. Security Tables
      await connection.query(`
        CREATE TABLE IF NOT EXISTS password_reset_tokens (
          id INT AUTO_INCREMENT PRIMARY KEY,
          email VARCHAR(255) NOT NULL,
          token VARCHAR(255) NOT NULL UNIQUE,
          expires_at TIMESTAMP NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          INDEX idx_email (email),
          INDEX idx_token (token),
          INDEX idx_expires_at (expires_at)
        )
      `);

      await connection.query(`
        CREATE TABLE IF NOT EXISTS refresh_tokens (
          id INT AUTO_INCREMENT PRIMARY KEY,
          user_id INT NOT NULL,
          token VARCHAR(255) NOT NULL UNIQUE,
          expires_at TIMESTAMP NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          user_agent VARCHAR(255) NULL,
          ip_address VARCHAR(45) NULL,
          revoked_at TIMESTAMP NULL,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
          INDEX idx_user_id (user_id),
          INDEX idx_expires_at (expires_at)
        )
      `);

      await connection.query(`
        CREATE TABLE IF NOT EXISTS audit_logs (
          id INT AUTO_INCREMENT PRIMARY KEY,
          user_id INT NOT NULL,
          user_type ENUM('admin', 'superadmin') NOT NULL,
          action VARCHAR(100) NOT NULL,
          details TEXT,
          ip_address VARCHAR(45) NULL,
          user_agent VARCHAR(255) NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          INDEX idx_user_id (user_id),
          INDEX idx_user_type (user_type),
          INDEX idx_action (action),
          INDEX idx_created_at (created_at)
        )
      `);

      await connection.query(`
        CREATE TABLE IF NOT EXISTS superadmin (
          id INT AUTO_INCREMENT PRIMARY KEY,
          username VARCHAR(100) NOT NULL UNIQUE,
          password VARCHAR(255) NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          password_changed_at TIMESTAMP NULL DEFAULT NULL,
          twofa_enabled TINYINT(1) DEFAULT 0,
          twofa_secret VARCHAR(255) NULL,
          INDEX idx_username (username)
        )
      `);

      await connection.query(`
        CREATE TABLE IF NOT EXISTS email_change_otps (
          id INT AUTO_INCREMENT PRIMARY KEY,
          user_id INT NOT NULL,
          user_role ENUM('user', 'admin', 'superadmin') NOT NULL,
          new_email VARCHAR(255) NOT NULL,
          current_email VARCHAR(255) NOT NULL,
          otp VARCHAR(6) NOT NULL,
          token VARCHAR(64) NOT NULL,
          expires_at DATETIME NOT NULL,
          used TINYINT(1) DEFAULT 0,
          verified_at DATETIME NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          INDEX idx_user_id (user_id),
          INDEX idx_user_role (user_role),
          INDEX idx_token (token),
          INDEX idx_expires_at (expires_at)
        )
      `);

      await connection.query(`
        CREATE TABLE IF NOT EXISTS login_attempts (
          id INT AUTO_INCREMENT PRIMARY KEY,
          identifier VARCHAR(255) NOT NULL,
          ip_address VARCHAR(45) NULL,
          attempt_type ENUM('failed', 'success') NOT NULL,
          user_type ENUM('user', 'admin', 'superadmin') NOT NULL DEFAULT 'user',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          INDEX idx_identifier (identifier),
          INDEX idx_ip (ip_address),
          INDEX idx_created (created_at),
          INDEX idx_user_type (user_type),
          INDEX idx_combined (identifier, ip_address, user_type, attempt_type)
        )
      `);
      
      await connection.query(`
        CREATE TABLE IF NOT EXISTS admin_sessions (
          id INT AUTO_INCREMENT PRIMARY KEY,
          admin_id INT NOT NULL,
          token_hash VARCHAR(64) NOT NULL,
          fingerprint VARCHAR(64) NOT NULL,
          ip_address VARCHAR(45) NOT NULL,
          user_agent VARCHAR(500) NULL,
          expires_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (admin_id) REFERENCES admins(id) ON DELETE CASCADE,
          INDEX idx_admin_id (admin_id),
          INDEX idx_token_hash (token_hash),
          INDEX idx_fingerprint (fingerprint),
          INDEX idx_expires_at (expires_at)
        )
      `);

      await connection.query(`
        CREATE TABLE IF NOT EXISTS security_logs (
          id INT AUTO_INCREMENT PRIMARY KEY,
          user_id INT NULL,
          user_type ENUM('admin', 'superadmin', 'user') NULL,
          action VARCHAR(100) NOT NULL,
          details TEXT,
          ip_address VARCHAR(45) NULL,
          user_agent VARCHAR(255) NULL,
          severity ENUM('low', 'medium', 'high', 'critical') DEFAULT 'medium',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          INDEX idx_user_id (user_id),
          INDEX idx_user_type (user_type),
          INDEX idx_action (action),
          INDEX idx_severity (severity),
          INDEX idx_created_at (created_at)
        )
      `);

      // Insert default data for UI tables
      await connection.query(`
        INSERT IGNORE INTO branding (logo_url, name_url, favicon_url) 
        VALUES (NULL, NULL, NULL)
      `);

      await connection.query(`
        INSERT IGNORE INTO site_name (site_name) 
        VALUES ('FAITH CommUNITY')
      `);

      await connection.query(`
        INSERT IGNORE INTO footer_content (section_type, title, url, display_order) VALUES
        ('contact', 'phone', '+163-3654-7896', 1),
        ('contact', 'email', 'info@faithcommunity.com', 2),
        ('copyright', 'copyright', '© Copyright 2025 FAITH CommUNITY. All Rights Reserved.', 1)
      `);

      await connection.query(`
        INSERT IGNORE INTO hero_section (tag, heading) VALUES
        ('Welcome to FAITH CommUNITY', 'A Unified Platform for Community Extension Programs')
      `);

      await connection.query(`
        INSERT IGNORE INTO hero_section_images (image_id, heading, subheading, display_order) VALUES
        (1, 'Inside the Initiative', 'Where Ideas Take Root', 1),
        (2, 'Collaboration', 'Working Together', 2),
        (3, 'Innovation', 'Building the Future', 3)
      `);


      await connection.query(`
        INSERT IGNORE INTO mission_vision (type, content) VALUES
        ('mission', 'To provide quality education and community service through innovative programs and partnerships.'),
        ('vision', 'To be a leading institution in community development and social transformation.')
      `);
      
      // Handle existing data migrations for news table
      const [existingNews] = await connection.query(`
        SELECT COUNT(*) as count FROM news WHERE slug IS NULL OR slug = ''
      `);
      
      if (existingNews[0].count > 0) {
        // Set slug from title for existing records
        await connection.query(`
          UPDATE news 
          SET slug = LOWER(REPLACE(REPLACE(REPLACE(REPLACE(title, ' ', '-'), '&', 'and'), '?', ''), '!', ''))
          WHERE slug IS NULL OR slug = ''
        `);
        
        // Set content from description for existing records
        await connection.query(`
          UPDATE news 
          SET content = description
          WHERE (content IS NULL OR content = '') AND description IS NOT NULL
        `);
        
        // Generate basic excerpt from description for existing records
        await connection.query(`
          UPDATE news 
          SET excerpt = CASE 
              WHEN LENGTH(description) > 180 
              THEN CONCAT(LEFT(description, 177), '...')
              ELSE description
          END
          WHERE excerpt IS NULL OR excerpt = ''
        `);
        
        // Set published_at from date for existing records
        await connection.query(`
          UPDATE news 
          SET published_at = COALESCE(date, created_at)
          WHERE published_at IS NULL
        `);

        // Clean up slug duplicates by appending ID
        await connection.query(`
          UPDATE news n1
          SET slug = CONCAT(slug, '-', id)
          WHERE EXISTS (
              SELECT 1 FROM (SELECT slug FROM news GROUP BY slug HAVING COUNT(*) > 1) n2 
              WHERE n1.slug = n2.slug
          ) AND n1.id NOT IN (
              SELECT MIN(id) FROM (SELECT id, slug FROM news) n3 GROUP BY slug
          )
        `);

        // Remove description column after data migration
        await connection.query(`ALTER TABLE news DROP COLUMN description`);
      }

      // Handle existing programs slug generation
      const [existingPrograms] = await connection.query(`
        SELECT id, title FROM programs_projects WHERE slug IS NULL
      `);
      
      for (const program of existingPrograms) {
        const slug = program.title
          .toLowerCase()
          .replace(/[^a-z0-9\s-]/g, '') // Remove special characters
          .replace(/\s+/g, '-') // Replace spaces with hyphens
          .replace(/-+/g, '-') // Replace multiple hyphens with single
          .trim('-'); // Remove leading/trailing hyphens
        
        // Ensure uniqueness by appending ID if needed
        let finalSlug = slug;
        let counter = 1;
        while (true) {
          const [existingSlug] = await connection.query(`
            SELECT id FROM programs_projects WHERE slug = ? AND id != ?
          `, [finalSlug, program.id]);
          
          if (existingSlug.length === 0) {
            break;
          }
          finalSlug = `${slug}-${counter}`;
          counter++;
        }
        
        await connection.query(`
          UPDATE programs_projects SET slug = ? WHERE id = ?
        `, [finalSlug, program.id]);
      }

      // Handle existing messages user linking
      await connection.query(`
        UPDATE messages m 
        JOIN users u ON m.sender_email = u.email 
        SET m.user_id = u.id 
        WHERE m.user_id IS NULL
      `);

      // Handle existing subscribers verification fix
      await connection.query(`
        UPDATE subscribers 
        SET is_verified = 0 
        WHERE is_verified = 1 AND verified_at IS NULL
      `);

      // Record migration as executed
      await connection.query(
        'INSERT INTO migrations (name) VALUES (?)',
        ['database_initialized']
      );

    } else {
      
      // Run incremental migrations for existing databases
      await runIncrementalMigrations(connection);
    }

    return promisePool;
  } catch (error) {
    logError('Database initialization failed', error, { context: 'database' });
    throw error;
  } finally {
    connection.release();
  }
};

// Initialize database immediately
initializeDatabase().then(() => {
}).catch(error => {
  logError('Database initialization failed', error, { context: 'database' });
  process.exit(1);
});

// Export the promise pool for backward compatibility
export default promisePool;