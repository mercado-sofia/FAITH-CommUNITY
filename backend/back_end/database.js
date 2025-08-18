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
          sender_email VARCHAR(255) NOT NULL,
          sender_name VARCHAR(255),
          message TEXT NOT NULL,
          is_read BOOLEAN DEFAULT FALSE,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
          INDEX idx_organization_read (organization_id, is_read),
          INDEX idx_created_at (created_at)
        )
      `);
      console.log("✅ Messages table created successfully!");
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