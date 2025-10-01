import mysql from "mysql2";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

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
    console.log('🔄 Running incremental migrations...');

    // Check if organizations table has org and orgName columns
    const [orgColumns] = await connection.query(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'organizations' 
      AND COLUMN_NAME IN ('org', 'orgName')
    `);
    
    if (orgColumns.length < 2) {
      console.log('🔄 Adding org and orgName columns to organizations table...');
      await connection.query(`
        ALTER TABLE organizations 
        ADD COLUMN org VARCHAR(50) NULL UNIQUE,
        ADD COLUMN orgName VARCHAR(255) NULL
      `);
      
      // Migrate existing data from admins to organizations if needed
      await connection.query(`
        UPDATE organizations o
        INNER JOIN admins a ON o.id = a.organization_id
        SET o.org = a.org, o.orgName = a.orgName
        WHERE a.org IS NOT NULL AND a.orgName IS NOT NULL
      `);
    }

    // Check if organizations table has status column
    const [statusColumn] = await connection.query(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'organizations' 
      AND COLUMN_NAME = 'status'
    `);
    
    if (statusColumn.length === 0) {
      console.log('🔄 Adding status column to organizations table...');
      await connection.query(`
        ALTER TABLE organizations 
        ADD COLUMN status ENUM('ACTIVE', 'INACTIVE') DEFAULT 'ACTIVE'
      `);
    }

    // Check if admins table has organization_id column
    const [orgIdColumn] = await connection.query(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'admins' 
      AND COLUMN_NAME = 'organization_id'
    `);
    
    if (orgIdColumn.length === 0) {
      console.log('🔄 Adding organization_id column to admins table...');
      await connection.query(`
        ALTER TABLE admins 
        ADD COLUMN organization_id INT NULL,
        ADD CONSTRAINT fk_admins_organization 
        FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE SET NULL
      `);
    }

    // Check if admins table has is_active column
    const [isActiveColumn] = await connection.query(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'admins' 
      AND COLUMN_NAME = 'is_active'
    `);
    
    if (isActiveColumn.length === 0) {
      console.log('🔄 Adding is_active column to admins table...');
      await connection.query(`
        ALTER TABLE admins 
        ADD COLUMN is_active BOOLEAN DEFAULT TRUE
      `);
    }

    // Check if admins table has password_changed_at column
    const [passwordChangedAtColumn] = await connection.query(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'admins' 
      AND COLUMN_NAME = 'password_changed_at'
    `);
    
    if (passwordChangedAtColumn.length === 0) {
      console.log('🔄 Adding password_changed_at column to admins table...');
      await connection.query(`
        ALTER TABLE admins 
        ADD COLUMN password_changed_at TIMESTAMP NULL DEFAULT NULL
      `);
    }

    // Check if news table has enhanced columns
    const [enhancedColumns] = await connection.query(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'news' 
      AND COLUMN_NAME IN ('slug', 'content', 'excerpt', 'featured_image', 'published_at')
    `);
    
    if (enhancedColumns.length < 5) {
      console.log('🔄 Adding enhanced columns to news table...');
      
      const columnsToAdd = [
        { name: 'slug', definition: 'VARCHAR(255) UNIQUE AFTER title' },
        { name: 'content', definition: 'LONGTEXT AFTER description' },
        { name: 'excerpt', definition: 'TEXT AFTER content' },
        { name: 'featured_image', definition: 'VARCHAR(500) AFTER excerpt' },
        { name: 'published_at', definition: 'DATETIME AFTER featured_image' }
      ];

      for (const column of columnsToAdd) {
        try {
          const [existingColumn] = await connection.query(`
            SELECT COLUMN_NAME 
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_NAME = 'news' 
            AND COLUMN_NAME = '${column.name}'
          `);
          
          if (existingColumn.length === 0) {
            await connection.query(`ALTER TABLE news ADD COLUMN ${column.name} ${column.definition}`);
          }
        } catch (error) {
          if (error.code !== 'ER_DUP_FIELDNAME') {
            console.error(`Error adding ${column.name} column:`, error.message);
          }
        }
      }

      // Migrate existing data
      await connection.query(`
        UPDATE news 
        SET slug = LOWER(REPLACE(REPLACE(REPLACE(REPLACE(title, ' ', '-'), '&', 'and'), '?', ''), '!', ''))
        WHERE slug IS NULL OR slug = ''
      `);
      
      await connection.query(`
        UPDATE news 
        SET content = description
        WHERE content IS NULL OR content = ''
      `);
      
      await connection.query(`
        UPDATE news 
        SET excerpt = CASE 
            WHEN LENGTH(description) > 180 
            THEN CONCAT(LEFT(description, 177), '...')
            ELSE description
        END
        WHERE excerpt IS NULL OR excerpt = ''
      `);
      
      await connection.query(`
        UPDATE news 
        SET published_at = COALESCE(date, created_at)
        WHERE published_at IS NULL
      `);
    }

    // Check if programs_projects table has slug field
    const [slugColumns] = await connection.query(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'programs_projects' 
      AND COLUMN_NAME = 'slug'
    `);
    
    if (slugColumns.length === 0) {
      console.log('🔄 Adding slug column to programs_projects table...');
      await connection.query(`
        ALTER TABLE programs_projects 
        ADD COLUMN slug VARCHAR(255) NULL UNIQUE
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
    }

    // Check if programs_projects table has is_featured column
    const [featuredColumn] = await connection.query(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'programs_projects' 
      AND COLUMN_NAME = 'is_featured'
    `);
    
    if (featuredColumn.length === 0) {
      console.log('🔄 Adding is_featured column to programs_projects table...');
      await connection.query(`
        ALTER TABLE programs_projects 
        ADD COLUMN is_featured BOOLEAN DEFAULT FALSE
      `);
    }

    // Check if programs_projects table has is_approved column
    const [approvedColumn] = await connection.query(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'programs_projects' 
      AND COLUMN_NAME = 'is_approved'
    `);
    
    if (approvedColumn.length === 0) {
      console.log('🔄 Adding is_approved column to programs_projects table...');
      await connection.query(`
        ALTER TABLE programs_projects 
        ADD COLUMN is_approved BOOLEAN DEFAULT TRUE
      `);
    }

    // Check if programs_projects table has is_collaborative column
    const [collaborativeColumn] = await connection.query(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'programs_projects' 
      AND COLUMN_NAME = 'is_collaborative'
    `);
    
    if (collaborativeColumn.length === 0) {
      console.log('🔄 Adding is_collaborative column to programs_projects table...');
      await connection.query(`
        ALTER TABLE programs_projects 
        ADD COLUMN is_collaborative BOOLEAN DEFAULT FALSE
      `);
    }

    // Check if programs_projects table has event date fields
    const [dateColumns] = await connection.query(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'programs_projects' 
      AND COLUMN_NAME IN ('event_start_date', 'event_end_date')
    `);
    
    if (dateColumns.length === 0) {
      console.log('🔄 Adding event date columns to programs_projects table...');
      await connection.query(`
        ALTER TABLE programs_projects 
        ADD COLUMN event_start_date DATE NULL,
        ADD COLUMN event_end_date DATE NULL
      `);
    }

    // Check if users table has required columns
    const [userColumns] = await connection.query(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'users' 
      AND COLUMN_NAME IN ('password_hash', 'is_active', 'email_verified', 'verification_token', 'newsletter_subscribed', 'profile_photo_url')
    `);
    
    if (userColumns.length < 6) {
      console.log('🔄 Adding missing columns to users table...');
      
      const userColumnsToAdd = [
        { name: 'password_hash', definition: 'VARCHAR(255) NOT NULL AFTER email' },
        { name: 'is_active', definition: 'TINYINT(1) DEFAULT 1' },
        { name: 'email_verified', definition: 'TINYINT(1) DEFAULT 0' },
        { name: 'verification_token', definition: 'VARCHAR(255) NULL' },
        { name: 'verification_token_expires', definition: 'TIMESTAMP NULL' },
        { name: 'newsletter_subscribed', definition: 'TINYINT(1) DEFAULT 0' },
        { name: 'profile_photo_url', definition: 'VARCHAR(500)' }
      ];

      for (const column of userColumnsToAdd) {
        try {
          const [existingColumn] = await connection.query(`
            SELECT COLUMN_NAME 
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_NAME = 'users' 
            AND COLUMN_NAME = '${column.name}'
          `);
          
          if (existingColumn.length === 0) {
            await connection.query(`ALTER TABLE users ADD COLUMN ${column.name} ${column.definition}`);
          }
        } catch (error) {
          if (error.code !== 'ER_DUP_FIELDNAME') {
            console.error(`Error adding ${column.name} column:`, error.message);
          }
        }
      }
    }

    // Check if full_name column exists in users table
    const [fullNameColumn] = await connection.query(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'users' 
      AND COLUMN_NAME = 'full_name'
    `);
    
    if (fullNameColumn.length === 0) {
      console.log('🔄 Adding full_name column to users table...');
      await connection.query(`
        ALTER TABLE users 
        ADD COLUMN full_name VARCHAR(200) GENERATED ALWAYS AS (CONCAT(first_name, ' ', last_name)) STORED
      `);
    }

    // Check if messages table has user_id column
    const [messagesUserIdColumn] = await connection.query(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'messages' 
      AND COLUMN_NAME = 'user_id'
    `);
    
    if (messagesUserIdColumn.length === 0) {
      console.log('🔄 Adding user_id column to messages table...');
      await connection.query(`
        ALTER TABLE messages 
        ADD COLUMN user_id INT NULL,
        ADD FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
        ADD INDEX idx_user_id (user_id)
      `);
      
      // Link existing messages with users based on email
      await connection.query(`
        UPDATE messages m 
        JOIN users u ON m.sender_email = u.email 
        SET m.user_id = u.id 
        WHERE m.user_id IS NULL
      `);
    }

    // Check if subscribers table has verified_at column
    const [subscribersVerifiedAtColumn] = await connection.query(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'subscribers' 
      AND COLUMN_NAME = 'verified_at'
    `);
    
    if (subscribersVerifiedAtColumn.length === 0) {
      console.log('🔄 Adding verified_at column to subscribers table...');
      await connection.query(`
        ALTER TABLE subscribers 
        ADD COLUMN verified_at TIMESTAMP NULL
      `);
    }

    // Fix subscribers is_verified column default value
    const [isVerifiedColumn] = await connection.query(`
      SELECT COLUMN_DEFAULT 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'subscribers' 
      AND COLUMN_NAME = 'is_verified'
    `);
    
    if (isVerifiedColumn.length > 0 && isVerifiedColumn[0].COLUMN_DEFAULT !== '0') {
      console.log('🔄 Fixing is_verified column default value in subscribers table...');
      await connection.query(`
        ALTER TABLE subscribers 
        MODIFY COLUMN is_verified TINYINT(1) DEFAULT 0
      `);
      
      // Fix any incorrectly verified subscriptions
      await connection.query(`
        UPDATE subscribers 
        SET is_verified = 0 
        WHERE is_verified = 1 AND verified_at IS NULL
      `);
    }

    // Check if volunteers table has 'Completed' status
    const [volunteersStatusColumn] = await connection.query(`
      SELECT COLUMN_TYPE FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'volunteers' AND COLUMN_NAME = 'status' AND TABLE_SCHEMA = DATABASE()
    `);
    
    if (volunteersStatusColumn.length > 0 && !volunteersStatusColumn[0].COLUMN_TYPE.includes('Completed')) {
      console.log('🔄 Adding Completed status to volunteers table...');
      await connection.query(`
        ALTER TABLE volunteers 
        MODIFY COLUMN status ENUM('Pending', 'Approved', 'Declined', 'Cancelled', 'Completed') 
        DEFAULT 'Pending'
      `);
    }

    // Check if volunteers table has 'Cancelled' status
    if (volunteersStatusColumn.length > 0 && !volunteersStatusColumn[0].COLUMN_TYPE.includes('Cancelled')) {
      console.log('🔄 Adding Cancelled status to volunteers table...');
      await connection.query(`
        ALTER TABLE volunteers 
        MODIFY COLUMN status ENUM('Pending', 'Approved', 'Declined', 'Cancelled') DEFAULT 'Pending'
      `);
    }

    // Check if admin_notifications table has required types
    const [adminNotificationsTypeColumn] = await connection.query(`
      SELECT COLUMN_TYPE 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'admin_notifications' 
      AND COLUMN_NAME = 'type'
    `);
    
    if (adminNotificationsTypeColumn.length > 0 && !adminNotificationsTypeColumn[0].COLUMN_TYPE.includes("'message'")) {
      console.log('🔄 Adding message type to admin_notifications table...');
      await connection.query(`
        ALTER TABLE admin_notifications 
        MODIFY COLUMN type ENUM('approval', 'decline', 'system', 'message', 'collaboration', 'program_approval') NOT NULL
      `);
    }

    // Check if superadmin_notifications table has organization_id column
    const [superadminNotificationsOrgColumn] = await connection.query(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'superadmin_notifications' 
      AND COLUMN_NAME = 'organization_id'
    `);
    
    if (superadminNotificationsOrgColumn.length === 0) {
      console.log('🔄 Adding organization_id column to superadmin_notifications table...');
      await connection.query(`
        ALTER TABLE superadmin_notifications 
        ADD COLUMN organization_id INT AFTER submission_id
      `);
      
      await connection.query(`
        ALTER TABLE superadmin_notifications 
        ADD CONSTRAINT fk_notifications_organization 
        FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE SET NULL
      `);
      
      await connection.query(`
        ALTER TABLE superadmin_notifications 
        ADD INDEX idx_organization (organization_id)
      `);
    }

    // Check if superadmin_notifications table has message_template column
    const [messageTemplateColumn] = await connection.query(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'superadmin_notifications' 
      AND COLUMN_NAME = 'message_template'
    `);
    
    if (messageTemplateColumn.length === 0) {
      console.log('🔄 Adding message_template column to superadmin_notifications table...');
      await connection.query(`
        ALTER TABLE superadmin_notifications 
        ADD COLUMN message_template TEXT AFTER message
      `);
      
      await connection.query(`
        UPDATE superadmin_notifications 
        SET message_template = message
        WHERE message_template IS NULL
      `);
    }

    // Check if superadmin table has 2FA columns
    const [superadmin2FAColumns] = await connection.query(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'superadmin' 
      AND COLUMN_NAME IN ('twofa_enabled', 'twofa_secret')
    `);
    
    if (superadmin2FAColumns.length < 2) {
      console.log('🔄 Adding 2FA columns to superadmin table...');
      
      if (!superadmin2FAColumns.some(col => col.COLUMN_NAME === 'twofa_enabled')) {
        await connection.query(`ALTER TABLE superadmin ADD COLUMN twofa_enabled TINYINT(1) DEFAULT 0`);
      }
      
      if (!superadmin2FAColumns.some(col => col.COLUMN_NAME === 'twofa_secret')) {
        await connection.query(`ALTER TABLE superadmin ADD COLUMN twofa_secret VARCHAR(255) NULL`);
      }
    }

    // Check if branding table has name_url column
    const [brandingNameUrlColumn] = await connection.query(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'branding' 
      AND COLUMN_NAME = 'name_url'
    `);
    
    if (brandingNameUrlColumn.length === 0) {
      console.log('🔄 Adding name_url column to branding table...');
      await connection.query(`
        ALTER TABLE branding 
        ADD COLUMN name_url VARCHAR(500) NULL AFTER logo_url
      `);
    }

    // Check if hero_section table has new columns
    const [heroSectionColumns] = await connection.query(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'hero_section' 
      AND COLUMN_NAME IN ('video_link', 'video_type')
    `);
    
    if (heroSectionColumns.length < 2) {
      console.log('🔄 Adding new columns to hero_section table...');
      
      if (!heroSectionColumns.some(col => col.COLUMN_NAME === 'video_link')) {
        await connection.query(`
          ALTER TABLE hero_section 
          ADD COLUMN video_link VARCHAR(500) NULL AFTER video_url
        `);
      }
      
      if (!heroSectionColumns.some(col => col.COLUMN_NAME === 'video_type')) {
        await connection.query(`
          ALTER TABLE hero_section 
          ADD COLUMN video_type ENUM('upload', 'link') DEFAULT 'upload' AFTER video_link
        `);
      }
    }

    // Check if about_us table has tag column (should be removed)
    const [aboutUsTagColumn] = await connection.query(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'about_us' 
      AND COLUMN_NAME = 'tag'
    `);
    
    if (aboutUsTagColumn.length > 0) {
      console.log('🔄 Removing tag column from about_us table...');
      await connection.query('ALTER TABLE about_us DROP COLUMN tag');
    }

    console.log('✅ Incremental migrations completed successfully!');
  } catch (error) {
    console.error('❌ Incremental migrations failed:', error);
    throw error;
  }
};

// Initialize database function
const initializeDatabase = async () => {
  const connection = await promisePool.getConnection();

  try {
    console.log('🔄 Starting database initialization...');

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
      console.log('🔄 Running initial database migrations...');

      // 1. Core Tables
      await connection.query(`
        CREATE TABLE IF NOT EXISTS organizations (
          id INT AUTO_INCREMENT PRIMARY KEY,
          org VARCHAR(50) NULL UNIQUE,
          orgName VARCHAR(255) NULL,
          logo VARCHAR(500) NULL,
          facebook VARCHAR(500) NULL,
          description TEXT NULL,
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
          first_name VARCHAR(100) NOT NULL,
          last_name VARCHAR(100) NOT NULL,
          email VARCHAR(255) NOT NULL UNIQUE,
          password_hash VARCHAR(255) NOT NULL,
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
          status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
          image VARCHAR(500),
          event_start_date DATE NULL,
          event_end_date DATE NULL,
          is_featured BOOLEAN DEFAULT FALSE,
          is_approved BOOLEAN DEFAULT TRUE,
          is_collaborative BOOLEAN DEFAULT FALSE,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
          INDEX idx_programs_slug (slug),
          INDEX idx_programs_organization (organization_id),
          INDEX idx_programs_status (status),
          INDEX idx_programs_featured (is_featured),
          INDEX idx_programs_approved (is_approved)
        )
      `);

      await connection.query(`
        CREATE TABLE IF NOT EXISTS news (
          id INT AUTO_INCREMENT PRIMARY KEY,
          organization_id INT NOT NULL,
          title VARCHAR(255) NOT NULL,
          slug VARCHAR(255) UNIQUE,
          description TEXT NOT NULL,
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
          status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
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
          type ENUM('approval', 'decline', 'system', 'message', 'collaboration', 'program_approval') NOT NULL,
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
          is_read BOOLEAN DEFAULT FALSE,
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
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            verified_at TIMESTAMP NULL,
            INDEX idx_email (email),
            INDEX idx_verify_token (verify_token),
            INDEX idx_unsubscribe_token (unsubscribe_token),
            INDEX idx_is_verified (is_verified)
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
          program_id INT NOT NULL,
          collaborator_admin_id INT NOT NULL,
          invited_by_admin_id INT NOT NULL,
          status ENUM('accepted', 'declined') DEFAULT 'accepted',
          invited_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          responded_at TIMESTAMP NULL,
          FOREIGN KEY (program_id) REFERENCES programs_projects(id) ON DELETE CASCADE,
          FOREIGN KEY (collaborator_admin_id) REFERENCES admins(id) ON DELETE CASCADE,
          FOREIGN KEY (invited_by_admin_id) REFERENCES admins(id) ON DELETE CASCADE,
          UNIQUE KEY unique_program_collaborator (program_id, collaborator_admin_id),
          INDEX idx_collaborator_status (collaborator_admin_id, status),
          INDEX idx_program_status (program_id, status)
        )
      `);

          await connection.query(`
        CREATE TABLE IF NOT EXISTS program_event_dates (
          id INT AUTO_INCREMENT PRIMARY KEY,
          program_id INT NOT NULL,
          event_date DATE NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
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
          email VARCHAR(255),
          phone VARCHAR(50),
          image_url VARCHAR(500),
          position VARCHAR(100) DEFAULT 'Head of FACES',
          display_order INT DEFAULT 0,
          status ENUM('ACTIVE', 'INACTIVE') DEFAULT 'ACTIVE',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
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
          heading TEXT DEFAULT 'We Believe That We Can Help More People With You',
          description TEXT DEFAULT 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris.',
          extension_categories JSON DEFAULT '[
            {"name": "Extension For Education", "color": "green"},
            {"name": "Extension For Medical", "color": "red"},
            {"name": "Extension For Community", "color": "orange"},
            {"name": "Extension For Foods", "color": "green"}
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
          email VARCHAR(255) NOT NULL,
          ip_address VARCHAR(45) NOT NULL,
          user_agent VARCHAR(255) NULL,
          success BOOLEAN NOT NULL,
          failure_reason VARCHAR(100) NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          INDEX idx_email (email),
          INDEX idx_ip_address (ip_address),
          INDEX idx_success (success),
          INDEX idx_created_at (created_at)
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
        INSERT IGNORE INTO about_us (heading, description) VALUES
        ('We Believe That We Can Help More People With You', 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris.')
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
          WHERE content IS NULL OR content = ''
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

      console.log('✅ Database initialization completed successfully!');
    } else {
      console.log('⏭️  Database already initialized, running incremental migrations...');
      
      // Run incremental migrations for existing databases
      await runIncrementalMigrations(connection);
    }

    return promisePool;
  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    throw error;
  } finally {
    connection.release();
  }
};

// Initialize database immediately
initializeDatabase().then(() => {
  console.log('✅ Database connection established successfully!');
}).catch(error => {
  console.error('❌ Database initialization failed:', error);
  process.exit(1);
});

// Export the promise pool for backward compatibility
export default promisePool;