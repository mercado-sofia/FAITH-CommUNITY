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

// Log the database configuration (remove in production)
console.log("Database Configuration:", {
  host: dbConfig.host,
  user: dbConfig.user,
  database: dbConfig.database
});

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
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE
        )
      `);
      console.log("✅ News table created successfully!");
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