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
      return (JSON.parse(field.string()));
    }
    return next();
  },
  maxPacketSize: 16777216 // 16MB
};

// Database configuration loaded

// Create a connection pool
const pool = mysql.createPool(dbConfig);
const promisePool = pool.promise();

// Initialize database function
const initializeDatabase = async () => {
  try {
    const connection = await promisePool.getConnection();
    console.log("✅ Database connected successfully!");

    // Check if featured_projects table exists
    const [tables] = await connection.query('SHOW TABLES LIKE "featured_projects"');
    
    if (tables.length === 0) {
      console.log("Creating featured_projects table...");
      await connection.query(`
        CREATE TABLE featured_projects (
          id INT AUTO_INCREMENT PRIMARY KEY,
          program_id INT NOT NULL,
          organization_id INT NOT NULL,
          title VARCHAR(255) NOT NULL,
          description TEXT,
          image VARCHAR(255),
          status ENUM('active', 'completed', 'pending') DEFAULT 'active',
          completed_date DATE,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (program_id) REFERENCES programs_projects(id) ON DELETE CASCADE,
          FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE
        )
      `);
      console.log("✅ Featured_projects table created successfully!");
    }

    // Check if news table exists
    const [newsTables] = await connection.query('SHOW TABLES LIKE "news"');
    
    if (newsTables.length === 0) {
      console.log("Creating news table...");
      await connection.query(`
        CREATE TABLE news (
          id INT AUTO_INCREMENT PRIMARY KEY,
          organization_id INT NOT NULL,
          title VARCHAR(255) NOT NULL,
          description TEXT NOT NULL,
          date DATE,
          is_deleted BOOLEAN DEFAULT FALSE,
          deleted_at TIMESTAMP NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE
        )
      `);
      console.log("✅ News table created successfully!");
    } else {
      // Check if deleted_at column exists, add it if missing
      const [deletedAtColumn] = await connection.query(`
        SELECT COLUMN_NAME 
        FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_NAME = 'news' 
        AND COLUMN_NAME = 'deleted_at'
      `);
      
      if (deletedAtColumn.length === 0) {
        console.log("Adding deleted_at column to news table...");
        await connection.query(`
          ALTER TABLE news 
          ADD COLUMN deleted_at TIMESTAMP NULL,
          ADD COLUMN is_deleted BOOLEAN DEFAULT FALSE
        `);
        console.log("✅ deleted_at and is_deleted columns added to news table!");
      }
    }

    // Check if organization_id column exists in admins table, add it if missing
    const [orgIdColumn] = await connection.query(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'admins' 
      AND COLUMN_NAME = 'organization_id'
    `);
    
    if (orgIdColumn.length === 0) {
      console.log("Adding organization_id column to admins table...");
      await connection.query(`
        ALTER TABLE admins 
        ADD COLUMN organization_id INT NULL,
        ADD CONSTRAINT fk_admins_organization 
        FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE SET NULL
      `);
      console.log("✅ organization_id column and foreign key added to admins table!");
      
      // Check if there are existing admins that need organization records
      const [existingAdmins] = await connection.query(`
        SELECT COUNT(*) as count FROM admins WHERE organization_id IS NULL
      `);
      
      if (existingAdmins[0].count > 0) {
              // Found existing admins without organization records - sync endpoint available
      }
    } else {
      console.log("✅ organization_id column already exists in admins table");
    }

    // Check if programs_projects table has date fields, add them if missing
    const [dateColumns] = await connection.query(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'programs_projects' 
      AND COLUMN_NAME IN ('event_start_date', 'event_end_date')
    `);
    
    if (dateColumns.length === 0) {
      console.log("Adding date fields to programs_projects table...");
      await connection.query(`
        ALTER TABLE programs_projects 
        ADD COLUMN event_start_date DATE NULL,
        ADD COLUMN event_end_date DATE NULL
      `);
      console.log("✅ Date fields added to programs_projects table successfully!");
    }

    // Check if program_event_dates table exists
    const [eventDatesTables] = await connection.query('SHOW TABLES LIKE "program_event_dates"');
    
    if (eventDatesTables.length === 0) {
      console.log("Creating program_event_dates table...");
      await connection.query(`
        CREATE TABLE program_event_dates (
          id INT AUTO_INCREMENT PRIMARY KEY,
          program_id INT NOT NULL,
          event_date DATE NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (program_id) REFERENCES programs_projects(id) ON DELETE CASCADE,
          UNIQUE KEY unique_program_date (program_id, event_date)
        )
      `);
      console.log("✅ Program_event_dates table created successfully!");
    }

    // Check if program_additional_images table exists
    const [additionalImagesTables] = await connection.query('SHOW TABLES LIKE "program_additional_images"');
    
    if (additionalImagesTables.length === 0) {
      console.log("Creating program_additional_images table...");
      await connection.query(`
        CREATE TABLE program_additional_images (
          id INT AUTO_INCREMENT PRIMARY KEY,
          program_id INT NOT NULL,
          image_data LONGTEXT NOT NULL,
          image_order INT DEFAULT 0,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (program_id) REFERENCES programs_projects(id) ON DELETE CASCADE
        )
      `);
      console.log("✅ Program_additional_images table created successfully!");
    }

    // Check if featured_projects table has created_at field, add it if missing
    const [featuredCreatedAtColumns] = await connection.query(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'featured_projects' 
      AND COLUMN_NAME = 'created_at'
    `);
    
    if (featuredCreatedAtColumns.length === 0) {
      console.log("Adding created_at field to featured_projects table...");
      await connection.query(`
        ALTER TABLE featured_projects 
        ADD COLUMN created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      `);
      console.log("✅ Created_at field added to featured_projects table successfully!");
    }

    // Check if faqs table exists
    const [faqsTables] = await connection.query('SHOW TABLES LIKE "faqs"');
    
    if (faqsTables.length === 0) {
      console.log("Creating faqs table...");
      await connection.query(`
        CREATE TABLE faqs (
          id INT AUTO_INCREMENT PRIMARY KEY,
          question TEXT NOT NULL,
          answer TEXT NOT NULL,
          status ENUM('active', 'inactive') DEFAULT 'active',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        )
      `);
      console.log("✅ FAQs table created successfully!");
    }

    // Check if submissions table exists
    const [submissionsTables] = await connection.query('SHOW TABLES LIKE "submissions"');
    
    if (submissionsTables.length === 0) {
      console.log("Creating submissions table...");
      await connection.query(`
        CREATE TABLE submissions (
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
      console.log("✅ Submissions table created successfully!");
    }

    // Check if messages table exists
    const [messagesTables] = await connection.query('SHOW TABLES LIKE "messages"');
    
    if (messagesTables.length === 0) {
      console.log("Creating messages table...");
      await connection.query(`
        CREATE TABLE messages (
          id INT AUTO_INCREMENT PRIMARY KEY,
          organization_id INT NOT NULL,
          user_id INT NULL,
          sender_email VARCHAR(255) NOT NULL,
          sender_name VARCHAR(255),
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
      console.log("Messages table created successfully");
    } else {
      console.log("Messages table already exists");
      
      // Check if user_id column exists, if not add it
      const [userIdColumn] = await connection.query(
        "SHOW COLUMNS FROM messages LIKE 'user_id'"
      );
      
      if (userIdColumn.length === 0) {
        console.log("Adding user_id column to messages table...");
        await connection.query(`
          ALTER TABLE messages 
          ADD COLUMN user_id INT NULL,
          ADD FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
          ADD INDEX idx_user_id (user_id)
        `);
        console.log("user_id column added successfully");
        
        // Link existing messages with users based on email
        console.log("Linking existing messages with users...");
        await connection.query(`
          UPDATE messages m 
          JOIN users u ON m.sender_email = u.email 
          SET m.user_id = u.id 
          WHERE m.user_id IS NULL
        `);
        console.log("Existing messages linked successfully");
      }
      
      // Keep sender_email for unauth users, but remove sender_name since we get it from users table
      const [senderNameColumn] = await connection.query(
        "SHOW COLUMNS FROM messages LIKE 'sender_name'"
      );
      
      if (senderNameColumn.length > 0) {
        console.log("Removing sender_name column from messages table...");
        await connection.query(`
          ALTER TABLE messages 
          DROP COLUMN sender_name
        `);
        console.log("sender_name column removed successfully");
      }
    }

    // Check if notifications table exists
    const [notificationsTables] = await connection.query('SHOW TABLES LIKE "notifications"');
    
    if (notificationsTables.length === 0) {
      console.log("Creating notifications table...");
      await connection.query(`
        CREATE TABLE notifications (
          id INT AUTO_INCREMENT PRIMARY KEY,
          admin_id INT NOT NULL,
          type ENUM('approval', 'decline', 'system', 'message') NOT NULL,
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
      console.log("✅ Notifications table created successfully!");
    } else {
      // Check if 'message' type exists in the ENUM
      const [columnInfo] = await connection.query(`
        SELECT COLUMN_TYPE 
        FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_NAME = 'notifications' 
        AND COLUMN_NAME = 'type'
      `);
      
      if (columnInfo.length > 0 && !columnInfo[0].COLUMN_TYPE.includes("'message'")) {
        await connection.query(`
          ALTER TABLE notifications 
          MODIFY COLUMN type ENUM('approval', 'decline', 'system', 'message') NOT NULL
        `);
      }
    }

    // Check if password_reset_tokens table exists
    const [passwordResetTables] = await connection.query('SHOW TABLES LIKE "password_reset_tokens"');
    
    if (passwordResetTables.length === 0) {
      console.log("Creating password_reset_tokens table...");
      await connection.query(`
        CREATE TABLE password_reset_tokens (
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
      console.log("✅ Password reset tokens table created successfully!");
    }

    // Check if volunteers table exists
    const [volunteersTables] = await connection.query('SHOW TABLES LIKE "volunteers"');
    
    if (volunteersTables.length === 0) {
      console.log("Creating volunteers table...");
      await connection.query(`
        CREATE TABLE volunteers (
          id INT AUTO_INCREMENT PRIMARY KEY,
          user_id INT NOT NULL,
          program_id INT NOT NULL,
          reason TEXT NOT NULL,
          status ENUM('Pending', 'Approved', 'Declined') DEFAULT 'Pending',
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
      console.log("✅ Volunteers table created successfully!");
    } else {
      // Check if volunteers table needs migration to new structure
      const [oldStructureColumns] = await connection.query(`
        SELECT COLUMN_NAME 
        FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_NAME = 'volunteers' 
        AND COLUMN_NAME IN ('full_name', 'age', 'gender', 'email', 'phone_number', 'address', 'occupation', 'citizenship', 'valid_id')
      `);
      
      if (oldStructureColumns.length > 0) {
        console.log("Migrating volunteers table to new structure...");
        
        // Create new volunteers table with new structure
        await connection.query(`
          CREATE TABLE volunteers_new (
            id INT AUTO_INCREMENT PRIMARY KEY,
            user_id INT NOT NULL,
            program_id INT NOT NULL,
            reason TEXT NOT NULL,
            status ENUM('Pending', 'Approved', 'Declined') DEFAULT 'Pending',
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
        
        // Drop old table and rename new one
        await connection.query('DROP TABLE volunteers');
        await connection.query('RENAME TABLE volunteers_new TO volunteers');
        
        console.log("✅ Volunteers table migrated to new structure!");
      }
    }

    // Check if users table exists
    const [usersTables] = await connection.query('SHOW TABLES LIKE "users"');
    
    if (usersTables.length === 0) {
      console.log("Creating users table...");
      await connection.query(`
        CREATE TABLE users (
          id INT AUTO_INCREMENT PRIMARY KEY,
          first_name VARCHAR(100) NOT NULL,
          last_name VARCHAR(100) NOT NULL,
          email VARCHAR(255) NOT NULL UNIQUE,
          password_hash VARCHAR(255) NOT NULL,
          contact_number VARCHAR(20) NOT NULL,
          gender ENUM('Male', 'Female', 'Other') NOT NULL,
          address TEXT NOT NULL,
          birth_date DATE NOT NULL,
          occupation VARCHAR(255),
          citizenship VARCHAR(100),
          profile_photo_url VARCHAR(500),
          full_name VARCHAR(200) GENERATED ALWAYS AS (CONCAT(first_name, ' ', last_name)) STORED,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          last_login TIMESTAMP NULL,
          is_active TINYINT(1) DEFAULT 1,
          email_verified TINYINT(1) DEFAULT 0,
          verification_token VARCHAR(255) NULL,
          verification_token_expires TIMESTAMP NULL,
          INDEX idx_email (email),
          INDEX idx_created_at (created_at),
          INDEX idx_verification_token (verification_token),
          INDEX idx_email_verified (email_verified)
        )
      `);
      console.log("✅ Users table created successfully!");
    } else {
      // Check if password_hash column exists, add it if missing
      const [passwordHashColumn] = await connection.query(`
        SELECT COLUMN_NAME 
        FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_NAME = 'users' 
        AND COLUMN_NAME = 'password_hash'
      `);
      
      if (passwordHashColumn.length === 0) {
        console.log("Adding password_hash column to users table...");
        await connection.query(`
          ALTER TABLE users 
          ADD COLUMN password_hash VARCHAR(255) NOT NULL AFTER email
        `);
        console.log("✅ password_hash column added to users table!");
      }

      // Check if is_active column exists, add it if missing
      const [isActiveColumn] = await connection.query(`
        SELECT COLUMN_NAME 
        FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_NAME = 'users' 
        AND COLUMN_NAME = 'is_active'
      `);
      
      if (isActiveColumn.length === 0) {
        console.log("Adding is_active column to users table...");
        await connection.query(`
          ALTER TABLE users 
          ADD COLUMN is_active TINYINT(1) DEFAULT 1
        `);
        console.log("✅ is_active column added to users table!");
      }

      // Check if email_verified column exists, add it if missing
      const [emailVerifiedColumn] = await connection.query(`
        SELECT COLUMN_NAME 
        FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_NAME = 'users' 
        AND COLUMN_NAME = 'email_verified'
      `);
      
      if (emailVerifiedColumn.length === 0) {
        console.log("Adding email_verified column to users table...");
        await connection.query(`
          ALTER TABLE users 
          ADD COLUMN email_verified TINYINT(1) DEFAULT 0
        `);
        console.log("✅ email_verified column added to users table!");
      }

      // Check if verification_token column exists, add it if missing
      const [verificationTokenColumn] = await connection.query(`
        SELECT COLUMN_NAME 
        FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_NAME = 'users' 
        AND COLUMN_NAME = 'verification_token'
      `);
      
      if (verificationTokenColumn.length === 0) {
        console.log("Adding verification_token column to users table...");
        await connection.query(`
          ALTER TABLE users 
          ADD COLUMN verification_token VARCHAR(255) NULL,
          ADD COLUMN verification_token_expires TIMESTAMP NULL
        `);
        console.log("✅ verification_token columns added to users table!");
      }

      // Check if full_name column exists, add it if missing
      const [fullNameColumn] = await connection.query(`
        SELECT COLUMN_NAME 
        FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_NAME = 'users' 
        AND COLUMN_NAME = 'full_name'
      `);
      
      if (fullNameColumn.length === 0) {
        console.log("Adding full_name column to users table...");
        await connection.query(`
          ALTER TABLE users 
          ADD COLUMN full_name VARCHAR(200) GENERATED ALWAYS AS (CONCAT(first_name, ' ', last_name)) STORED
        `);
        console.log("✅ full_name column added to users table!");
      }

      // Check if verification_token index exists, add it if missing
      const [verificationTokenIndex] = await connection.query(`
        SELECT INDEX_NAME 
        FROM INFORMATION_SCHEMA.STATISTICS 
        WHERE TABLE_NAME = 'users' 
        AND INDEX_NAME = 'idx_verification_token'
      `);
      
      if (verificationTokenIndex.length === 0) {
        console.log("Adding verification_token index to users table...");
        await connection.query(`
          ALTER TABLE users 
          ADD INDEX idx_verification_token (verification_token)
        `);
        console.log("✅ verification_token index added to users table!");
      }

      // Check if email_verified index exists, add it if missing
      const [emailVerifiedIndex] = await connection.query(`
        SELECT INDEX_NAME 
        FROM INFORMATION_SCHEMA.STATISTICS 
        WHERE TABLE_NAME = 'users' 
        AND INDEX_NAME = 'idx_email_verified'
      `);
      
      if (emailVerifiedIndex.length === 0) {
        console.log("Adding email_verified index to users table...");
        await connection.query(`
          ALTER TABLE users 
          ADD INDEX idx_email_verified (email_verified)
        `);
        console.log("✅ email_verified index added to users table!");
      }

      // Check if newsletter_subscribed column exists, add it if missing
      const [newsletterSubscribedColumn] = await connection.query(`
        SELECT COLUMN_NAME 
        FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_NAME = 'users' 
        AND COLUMN_NAME = 'newsletter_subscribed'
      `);
      
      if (newsletterSubscribedColumn.length === 0) {
        console.log("Adding newsletter_subscribed column to users table...");
        await connection.query(`
          ALTER TABLE users 
          ADD COLUMN newsletter_subscribed TINYINT(1) DEFAULT 0
        `);
        console.log("✅ newsletter_subscribed column added to users table!");
      }

      // Check if profile_photo_url column exists, add it if missing
      const [profilePhotoUrlColumn] = await connection.query(`
        SELECT COLUMN_NAME 
        FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_NAME = 'users' 
        AND COLUMN_NAME = 'profile_photo_url'
      `);
      
      if (profilePhotoUrlColumn.length === 0) {
        console.log("Adding profile_photo_url column to users table...");
        await connection.query(`
          ALTER TABLE users 
          ADD COLUMN profile_photo_url VARCHAR(500)
        `);
        console.log("✅ profile_photo_url column added to users table!");
      }

      // Check if user_notifications table exists
      const [userNotificationsTable] = await connection.query('SHOW TABLES LIKE "user_notifications"');
      
      if (userNotificationsTable.length === 0) {
        console.log("Creating user_notifications table...");
        await connection.query(`
          CREATE TABLE user_notifications (
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
        console.log("✅ user_notifications table created successfully!");
      }
    }

    connection.release();
    return promisePool;
  } catch (error) {
    console.error("Database initialization error:", error);
    throw error;
  }
};

// Initialize database immediately and export
let dbInstance = null;

const getDb = async () => {
  if (!dbInstance) {
    dbInstance = await initializeDatabase();
  }
  return dbInstance;
};

// Initialize the database
initializeDatabase().then(db => {
  dbInstance = db;
  console.log("✅ Database initialization completed!");
}).catch(error => {
  console.error("❌ Database initialization failed:", error);
});

// Export the promise pool directly for backward compatibility
export default promisePool;