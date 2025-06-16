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
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "db_community",
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

// Test the connection and create table if it doesn't exist
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
          organization_id INT NOT NULL,
          title VARCHAR(255) NOT NULL,
          description TEXT,
          image VARCHAR(255),
          status ENUM('active', 'completed', 'pending') DEFAULT 'active',
          completed_date DATE,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
      console.log("✅ featured_projects table created successfully!");
    }

    connection.release();
    return promisePool;
  } catch (error) {
    console.error("Database initialization error:", error);
    throw error;
  }
};

// Initialize database and export promise pool
export default await initializeDatabase();