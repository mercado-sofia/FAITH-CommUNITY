import mysql from "mysql2";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import * as bcrypt from "bcrypt";
import { logError, logInfo, logWarn } from "./utils/logger.js";

// Get the directory name properly in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from the correct location
dotenv.config({ path: path.join(__dirname, '../../.env') });

// Validate required database environment variables
const validateDatabaseConfig = () => {
  const isProduction = process.env.NODE_ENV === 'production';
  const required = ['MYSQL_HOST', 'MYSQL_USER', 'MYSQL_DATABASE'];
  const missing = [];
  
  // Check required variables (MYSQL_PASSWORD can be empty for local dev)
  for (const key of required) {
    if (!process.env[key] || process.env[key].trim() === '') {
      missing.push(key);
    }
  }
  
  // In production, MYSQL_PASSWORD is required (Railway MySQL always has a password)
  if (isProduction && (!process.env.MYSQL_PASSWORD || process.env.MYSQL_PASSWORD.trim() === '')) {
    missing.push('MYSQL_PASSWORD');
  }
  
  if (missing.length > 0 && isProduction) {
    const error = new Error(
      `Missing required database environment variables: ${missing.join(', ')}\n` +
      `Please set these variables in Railway before deploying.\n` +
      `For Railway MySQL, use Railway variable references:\n` +
      `  MYSQL_HOST=\${{MySQL.MYSQLHOST}}\n` +
      `  MYSQL_PORT=\${{MySQL.MYSQLPORT}}\n` +
      `  MYSQL_USER=\${{MySQL.MYSQLUSER}}\n` +
      `  MYSQL_PASSWORD=\${{MySQL.MYSQLPASSWORD}}\n` +
      `  MYSQL_DATABASE=\${{MySQL.MYSQLDATABASE}}\n` +
      `Also ensure MYSQL_SSL=true is set for Railway MySQL.`
    );
    logError('Database configuration validation failed', error, { context: 'database', missing });
    throw error;
  }
  
  if (missing.length > 0) {
    logWarn(`Missing database environment variables: ${missing.join(', ')}. Using defaults.`, { context: 'database' });
  }
  
  return true;
};

// Validate config before creating pool
validateDatabaseConfig();

const dbConfig = {
  host: process.env.MYSQL_HOST || "localhost",
  port: Number(process.env.MYSQL_PORT) || 3306,
  user: process.env.MYSQL_USER || "root",
  password: process.env.MYSQL_PASSWORD || "",
  database: process.env.MYSQL_DATABASE || "db_community",
  waitForConnections: true,
  connectionLimit: Number(process.env.MYSQL_CONNECTION_LIMIT) || 10,
  queueLimit: 0,
  multipleStatements: true,
  // SSL configuration for production (Railway, etc.)
  ssl: process.env.MYSQL_SSL === 'true' || process.env.NODE_ENV === 'production' ? {
    rejectUnauthorized: process.env.MYSQL_SSL_REJECT_UNAUTHORIZED !== 'false'
  } : false,
  typeCast: function (field, next) {
    if (field.type === 'JSON') {
      return JSON.parse(field.string("utf8"));
    }
    return next();
  },
  // Connection timeout setting (valid for mysql2)
  connectTimeout: 10000, // 10 seconds
};

// Create a connection pool
const pool = mysql.createPool(dbConfig);
const promisePool = pool.promise();

// Test connection with retry logic
const testConnection = async (maxRetries = 3, delayMs = 2000) => {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const connection = await promisePool.getConnection();
      await connection.ping();
      connection.release();
      logInfo('Database connection test successful', { context: 'database', attempt });
      return true;
    } catch (error) {
      logWarn(`Database connection test failed (attempt ${attempt}/${maxRetries})`, { 
        context: 'database', 
        attempt,
        error: error.message,
        host: dbConfig.host,
        database: dbConfig.database
      });
      
      if (attempt < maxRetries) {
        logInfo(`Retrying database connection in ${delayMs}ms...`, { context: 'database' });
        await new Promise(resolve => setTimeout(resolve, delayMs));
      } else {
        // Provide helpful error message for Railway
        const errorMessage = error.message || 'Unknown error';
        let helpfulMessage = `Failed to connect to database after ${maxRetries} attempts.\n`;
        helpfulMessage += `Error: ${errorMessage}\n\n`;
        helpfulMessage += `Troubleshooting steps:\n`;
        helpfulMessage += `1. Verify MySQL service is running in Railway\n`;
        helpfulMessage += `2. Check environment variables are set correctly:\n`;
        helpfulMessage += `   - MYSQL_HOST: ${dbConfig.host || 'NOT SET'}\n`;
        helpfulMessage += `   - MYSQL_PORT: ${dbConfig.port || 'NOT SET'}\n`;
        helpfulMessage += `   - MYSQL_USER: ${dbConfig.user || 'NOT SET'}\n`;
        helpfulMessage += `   - MYSQL_DATABASE: ${dbConfig.database || 'NOT SET'}\n`;
        helpfulMessage += `   - MYSQL_SSL: ${dbConfig.ssl ? 'true' : 'false'}\n`;
        helpfulMessage += `3. For Railway MySQL, ensure MYSQL_SSL=true is set\n`;
        helpfulMessage += `4. Check Railway logs for MySQL service status\n`;
        
        const dbError = new Error(helpfulMessage);
        dbError.originalError = error;
        throw dbError;
      }
    }
  }
  return false;
};

// Incremental migrations for existing databases
const runIncrementalMigrations = async (connection) => {
  try {
    // Create program_post_act_reports table if it doesn't exist (for existing databases)
    await connection.query(`
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
      )
    `);

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

    // Enforce single superadmin account constraint
    try {
      // Check if table exists and has AUTO_INCREMENT
      const [columnInfo] = await connection.query(`
        SELECT COLUMN_KEY, EXTRA, COLUMN_DEFAULT
        FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'superadmin' 
        AND COLUMN_NAME = 'id'
      `);
      
      if (columnInfo.length > 0 && columnInfo[0].EXTRA && columnInfo[0].EXTRA.includes('auto_increment')) {
        // First, ensure we have at least one superadmin account (keep the first one)
        const [existingSuperadmins] = await connection.query(`SELECT id FROM superadmin ORDER BY id LIMIT 1`);
        
        if (existingSuperadmins.length > 0) {
          const keepId = existingSuperadmins[0].id;
          
          // Delete any superadmin accounts with id != keepId
          if (keepId !== 1) {
            // Update references in related tables before changing superadmin id
            // Update superadmin_notifications table
            try {
              await connection.query(`
                UPDATE superadmin_notifications 
                SET superadmin_id = 1 
                WHERE superadmin_id = ?
              `, [keepId]);
            } catch (err) {
              // Table might not exist, ignore
            }
            
            // Update program_post_act_reports table
            try {
              await connection.query(`
                UPDATE program_post_act_reports 
                SET reviewed_by_superadmin_id = 1 
                WHERE reviewed_by_superadmin_id = ?
              `, [keepId]);
            } catch (err) {
              // Table might not exist, ignore
            }
            
            // Update audit_logs table (if it references superadmin)
            try {
              await connection.query(`
                UPDATE audit_logs 
                SET user_id = 1 
                WHERE user_id = ? AND user_type = 'superadmin'
              `, [keepId]);
            } catch (err) {
              // Table might not exist, ignore
            }
            
            // Update the account we want to keep to id = 1
            await connection.query(`UPDATE superadmin SET id = 1 WHERE id = ?`, [keepId]);
          }
          
          // Delete any other superadmin accounts
          await connection.query(`DELETE FROM superadmin WHERE id != 1`);
        }
        
        // Remove AUTO_INCREMENT and set fixed ID
        await connection.query(`
          ALTER TABLE superadmin 
          MODIFY COLUMN id INT NOT NULL DEFAULT 1
        `);
        
        // Try to add CHECK constraint (MySQL 8.0.16+)
        try {
          // First check if constraint already exists
          const [constraints] = await connection.query(`
            SELECT CONSTRAINT_NAME 
            FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS 
            WHERE TABLE_SCHEMA = DATABASE()
            AND TABLE_NAME = 'superadmin' 
            AND CONSTRAINT_NAME = 'chk_single_superadmin'
          `);
          
          if (constraints.length === 0) {
            await connection.query(`
              ALTER TABLE superadmin 
              ADD CONSTRAINT chk_single_superadmin CHECK (id = 1)
            `);
          }
        } catch (checkError) {
          // CHECK constraint not supported (MySQL < 8.0.16), will use trigger instead
          logInfo('CHECK constraint not supported, will use trigger for enforcement', { context: 'database', migration: 'superadmin_single_account' });
        }
      }
    } catch (migrationError) {
      logError('Superadmin single account migration failed', migrationError, { context: 'database', migration: 'superadmin_single_account' });
    }

    // Create trigger to prevent multiple superadmin accounts (fallback for older MySQL)
    try {
      // Drop existing trigger if it exists
      await connection.query(`DROP TRIGGER IF EXISTS prevent_multiple_superadmin`);
      
      // Create trigger to enforce single superadmin
      // Note: Using DELIMITER workaround for MySQL triggers
      // We need to execute this as a single statement with proper delimiter handling
      await connection.query(`
        CREATE TRIGGER prevent_multiple_superadmin
        BEFORE INSERT ON superadmin
        FOR EACH ROW
        BEGIN
          DECLARE account_count INT DEFAULT 0;
          SELECT COUNT(*) INTO account_count FROM superadmin;
          IF account_count > 0 THEN
            SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Only one superadmin account is allowed';
          END IF;
          SET NEW.id = 1;
        END
      `);
    } catch (triggerError) {
      // Trigger creation failed, log but don't fail migration
      // This is non-critical as CHECK constraint or application logic will handle it
      logInfo('Trigger creation failed (non-critical)', { context: 'database', migration: 'superadmin_single_account', error: triggerError.message });
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
        // typeCast already parses JSON, so check if it's already an object
        const categories = typeof row.extension_categories === 'string' 
          ? JSON.parse(row.extension_categories) 
          : row.extension_categories;
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
    }

    // Add manual_status_override column if it doesn't exist (migration for existing databases)
    try {
      const [manualOverrideColumns] = await connection.query(`
        SELECT COLUMN_NAME 
        FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_SCHEMA = DATABASE() 
        AND TABLE_NAME = 'programs_projects' 
        AND COLUMN_NAME = 'manual_status_override'
      `);
      
      if (manualOverrideColumns.length === 0) {
        await connection.query(`
          ALTER TABLE programs_projects 
          ADD COLUMN manual_status_override BOOLEAN DEFAULT FALSE
        `);
        // Add index for performance (if it doesn't already exist)
        try {
          await connection.query(`
            CREATE INDEX idx_programs_manual_override ON programs_projects(manual_status_override)
          `);
        } catch (indexError) {
          // Index might already exist, which is fine
          logWarn('Index idx_programs_manual_override may already exist', { context: 'database' });
        }
        logInfo('Added manual_status_override column to programs_projects table', { context: 'database' });
      }
    } catch (error) {
      logError('Error adding manual_status_override column', error, { context: 'database' });
    }

    // Add status column to admin_highlights if it doesn't exist
    try {
      const [statusColumnCheck] = await connection.query(`
        SELECT COUNT(*) as count 
        FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_SCHEMA = DATABASE() 
        AND TABLE_NAME = 'admin_highlights' 
        AND COLUMN_NAME = 'status'
      `);
      
      if (statusColumnCheck[0].count === 0) {
        await connection.query(`
          ALTER TABLE admin_highlights 
          ADD COLUMN status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending'
        `);
      }
    } catch (statusError) {
      // Column might already exist or other error - silently skip
    }

    // Add index for status column
    try {
      const [indexCheck] = await connection.query(`
        SELECT COUNT(*) as count 
        FROM INFORMATION_SCHEMA.STATISTICS 
        WHERE TABLE_SCHEMA = DATABASE() 
        AND TABLE_NAME = 'admin_highlights' 
        AND INDEX_NAME = 'idx_status'
      `);
      
      if (indexCheck[0].count === 0) {
        await connection.query(`
          ALTER TABLE admin_highlights 
          ADD INDEX idx_status (status)
        `);
      }
    } catch (indexError) {
      // Index might already exist or other error - silently skip
    }

    // Create featured_highlights table if it doesn't exist
    try {
      const [tableCheck] = await connection.query(`
        SELECT COUNT(*) as count 
        FROM INFORMATION_SCHEMA.TABLES 
        WHERE TABLE_SCHEMA = DATABASE() 
        AND TABLE_NAME = 'featured_highlights'
      `);
      
      if (tableCheck[0].count === 0) {
        await connection.query(`
          CREATE TABLE featured_highlights (
            id INT AUTO_INCREMENT PRIMARY KEY,
            highlight_id INT NOT NULL,
            display_order INT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            FOREIGN KEY (highlight_id) REFERENCES admin_highlights(id) ON DELETE CASCADE,
            UNIQUE KEY unique_highlight (highlight_id),
            INDEX idx_display_order (display_order)
          )
        `);
      }
    } catch (featuredError) {
      // Table might already exist or other error - silently skip
    }

    // Add program_id column to admin_highlights if it doesn't exist
    try {
      const [programIdColumnCheck] = await connection.query(`
        SELECT COUNT(*) as count 
        FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_SCHEMA = DATABASE() 
        AND TABLE_NAME = 'admin_highlights' 
        AND COLUMN_NAME = 'program_id'
      `);
      
      if (programIdColumnCheck[0].count === 0) {
        await connection.query(`
          ALTER TABLE admin_highlights 
          ADD COLUMN program_id INT NULL,
          ADD FOREIGN KEY (program_id) REFERENCES programs(id) ON DELETE SET NULL,
          ADD INDEX idx_program_id (program_id)
        `);
      }
    } catch (programIdError) {
      // Column might already exist or other error - silently skip
    }

    // Fix admin_highlights id column to ensure AUTO_INCREMENT and PRIMARY KEY are properly set
    try {
      // Check if id column has AUTO_INCREMENT
      const [columnInfo] = await connection.query(`
        SELECT COLUMN_KEY, EXTRA 
        FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_SCHEMA = DATABASE() 
        AND TABLE_NAME = 'admin_highlights' 
        AND COLUMN_NAME = 'id'
      `);
      
      if (columnInfo.length > 0) {
        const hasAutoIncrement = columnInfo[0].EXTRA?.includes('auto_increment') || false;
        const hasPrimaryKey = columnInfo[0].COLUMN_KEY === 'PRI';
        
        if (!hasAutoIncrement || !hasPrimaryKey) {
          // First, check for and fix any duplicate IDs or problematic data
          const [duplicateCheck] = await connection.query(`
            SELECT id, COUNT(*) as count 
            FROM admin_highlights 
            WHERE id > 0 
            GROUP BY id 
            HAVING count > 1
          `);
          
          if (duplicateCheck.length > 0) {
            // Get max ID to start reassigning from
            const [maxIdResult] = await connection.query(`
              SELECT MAX(id) as max_id FROM admin_highlights WHERE id > 0
            `);
            let nextId = (maxIdResult[0].max_id || 0) + 1;
            
            // Fix each duplicate ID group
            for (const dup of duplicateCheck) {
              // Get all records with this duplicate ID, ordered by created_at
              const [records] = await connection.query(`
                SELECT id, created_at, title 
                FROM admin_highlights 
                WHERE id = ? 
                ORDER BY created_at ASC
              `, [dup.id]);
              
              // Keep the first record, reassign the rest using unique identifiers
              for (let i = 1; i < records.length; i++) {
                const record = records[i];
                await connection.query(`
                  UPDATE admin_highlights 
                  SET id = ? 
                  WHERE id = ? 
                  AND created_at = ? 
                  AND title = ?
                  LIMIT 1
                `, [nextId, dup.id, record.created_at, record.title]);
                nextId++;
              }
            }
            
            // Reset auto-increment to avoid conflicts
            await connection.query(`
              ALTER TABLE admin_highlights AUTO_INCREMENT = ?
            `, [nextId]);
          }
          
          // Now safely modify the column
          // If it doesn't have PRIMARY KEY, add it first
          if (!hasPrimaryKey) {
            await connection.query(`
              ALTER TABLE admin_highlights 
              ADD PRIMARY KEY (id)
            `);
          }
          
          // If it doesn't have AUTO_INCREMENT, add it
          if (!hasAutoIncrement) {
            // Get the current max ID to set AUTO_INCREMENT properly
            const [maxIdResult] = await connection.query(`
              SELECT MAX(id) as max_id FROM admin_highlights WHERE id > 0
            `);
            const maxId = maxIdResult[0].max_id || 0;
            const nextAutoIncrement = maxId + 1;
            
            await connection.query(`
              ALTER TABLE admin_highlights 
              MODIFY COLUMN id INT AUTO_INCREMENT
            `);
            
            // Set AUTO_INCREMENT to the next value after max ID
            await connection.query(`
              ALTER TABLE admin_highlights AUTO_INCREMENT = ?
            `, [nextAutoIncrement]);
          }
        }
      }
    } catch (idColumnFixError) {
      // Column fix skipped or failed - silently continue
    }

    // Fix any records with ID=0 by updating them to have proper auto-increment IDs
    try {
      const [zeroIdRecords] = await connection.query(`
        SELECT COUNT(*) as count FROM admin_highlights WHERE id = 0
      `);
      
      if (zeroIdRecords[0].count > 0) {
        // Get the next available ID
        const [maxIdResult] = await connection.query(`
          SELECT MAX(id) as max_id FROM admin_highlights WHERE id > 0
        `);
        let nextId = (maxIdResult[0].max_id || 0) + 1;
        
        // Get ALL records with ID=0 ordered by created_at
        const [allZeroRecords] = await connection.query(`
          SELECT id, created_at, title 
          FROM admin_highlights 
          WHERE id = 0 
          ORDER BY created_at ASC
        `);
        
        // Update each record individually with a unique identifier
        // Use a temporary unique identifier to track each record
        for (let i = 0; i < allZeroRecords.length; i++) {
          const record = allZeroRecords[i];
          const newId = nextId + i;
          
          // Update by using created_at and title as unique identifiers
          await connection.query(`
            UPDATE admin_highlights 
            SET id = ? 
            WHERE id = 0 
            AND created_at = ? 
            AND title = ?
            LIMIT 1
          `, [newId, record.created_at, record.title]);
        }
        
        // Reset auto-increment to ensure proper IDs for future inserts
        const finalNextId = nextId + allZeroRecords.length;
        await connection.query(`
          ALTER TABLE admin_highlights AUTO_INCREMENT = ?
        `, [finalNextId]);
      }
    } catch (idFixError) {
      // ID=0 fix skipped or failed - silently continue
    }

    // Ensure all existing highlights have a status (default to 'pending' if NULL)
    try {
      await connection.query(`
        UPDATE admin_highlights 
        SET status = 'pending' 
        WHERE status IS NULL
      `);
    } catch (statusUpdateError) {
      // Silently skip if update fails
    }

    // Auto-insert/update superadmin account (for existing databases)
    try {
      const superadminEmail = 'faithcommunityfaces@gmail.com';
      const superadminPassword = 'admin123'; // Easy password as requested
      const saltRounds = 10;
      const hashedPassword = await bcrypt.hash(superadminPassword, saltRounds);

      // Check if superadmin exists
      const [existingSuperadmin] = await connection.query(
        'SELECT id, username, password FROM superadmin WHERE id = 1'
      );

      if (existingSuperadmin.length === 0) {
        // Insert new superadmin account
        await connection.query(
          `INSERT INTO superadmin (id, username, password, password_changed_at) 
           VALUES (1, ?, ?, NOW()) 
           ON DUPLICATE KEY UPDATE username = ?, password = ?, password_changed_at = NOW()`,
          [superadminEmail, hashedPassword, superadminEmail, hashedPassword]
        );
        logInfo('Superadmin account created successfully (migration)', { 
          context: 'database', 
          email: superadminEmail 
        });
      } else {
        // Update existing superadmin if password is NULL or empty
        const existing = existingSuperadmin[0];
        if (!existing.password || existing.password.trim() === '') {
          await connection.query(
            `UPDATE superadmin 
             SET username = ?, password = ?, password_changed_at = NOW() 
             WHERE id = 1`,
            [superadminEmail, hashedPassword]
          );
          logInfo('Superadmin account password updated successfully (migration)', { 
            context: 'database', 
            email: superadminEmail 
          });
        } else {
          // Update username if it doesn't match (but keep existing password)
          if (existing.username !== superadminEmail) {
            await connection.query(
              `UPDATE superadmin SET username = ? WHERE id = 1`,
              [superadminEmail]
            );
            logInfo('Superadmin account username updated (migration)', { 
              context: 'database', 
              email: superadminEmail 
            });
          } else {
            logInfo('Superadmin account already exists with password (migration)', { 
              context: 'database', 
              email: superadminEmail 
            });
          }
        }
      }
    } catch (superadminError) {
      // Log error but don't fail migration
      logError('Failed to setup superadmin account (migration)', superadminError, { 
        context: 'database' 
      });
    }

  } catch (error) {
    logError('Incremental migrations failed', error, { context: 'database' });
    throw error;
  }
};

// Initialize database function
const initializeDatabase = async () => {
  // Test connection first with retry logic
  logInfo('Testing database connection...', { context: 'database' });
  await testConnection();
  
  const connection = await promisePool.getConnection();

  try {
    logInfo('Database connection acquired, starting initialization...', { context: 'database' });

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
          is_approved BOOLEAN DEFAULT FALSE,
          is_collaborative BOOLEAN DEFAULT FALSE,
          accepts_volunteers BOOLEAN DEFAULT TRUE,
          manual_status_override BOOLEAN DEFAULT FALSE,
          submitted_by_name VARCHAR(100) NULL,
          submitted_by_role VARCHAR(100) NULL,
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

      // Create program_post_act_reports table for Post Act Report submissions
      await connection.query(`
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
        )
      `);

      // Add submitted_by_name and submitted_by_role columns if they don't exist (migration for existing databases)
      try {
        // Check if submitted_by_name column exists
        const [nameColumns] = await connection.query(`
          SELECT COLUMN_NAME 
          FROM INFORMATION_SCHEMA.COLUMNS 
          WHERE TABLE_SCHEMA = DATABASE() 
          AND TABLE_NAME = 'programs_projects' 
          AND COLUMN_NAME = 'submitted_by_name'
        `);
        
        if (nameColumns.length === 0) {
          await connection.query(`
            ALTER TABLE programs_projects 
            ADD COLUMN submitted_by_name VARCHAR(100) NULL
          `);
          logInfo('Added submitted_by_name column to programs_projects table', { context: 'database' });
        }
      } catch (error) {
        logError('Error adding submitted_by_name column', error, { context: 'database' });
      }

      try {
        // Check if submitted_by_role column exists
        const [roleColumns] = await connection.query(`
          SELECT COLUMN_NAME 
          FROM INFORMATION_SCHEMA.COLUMNS 
          WHERE TABLE_SCHEMA = DATABASE() 
          AND TABLE_NAME = 'programs_projects' 
          AND COLUMN_NAME = 'submitted_by_role'
        `);
        
        if (roleColumns.length === 0) {
          await connection.query(`
            ALTER TABLE programs_projects 
            ADD COLUMN submitted_by_role VARCHAR(100) NULL
          `);
          logInfo('Added submitted_by_role column to programs_projects table', { context: 'database' });
        }
      } catch (error) {
        logError('Error adding submitted_by_role column', error, { context: 'database' });
      }

      // Add edited_by_name and edited_by_role columns if they don't exist (migration for existing databases)
      try {
        // Check if edited_by_name column exists
        const [editedNameColumns] = await connection.query(`
          SELECT COLUMN_NAME 
          FROM INFORMATION_SCHEMA.COLUMNS 
          WHERE TABLE_SCHEMA = DATABASE() 
          AND TABLE_NAME = 'programs_projects' 
          AND COLUMN_NAME = 'edited_by_name'
        `);
        
        if (editedNameColumns.length === 0) {
          await connection.query(`
            ALTER TABLE programs_projects 
            ADD COLUMN edited_by_name VARCHAR(100) NULL
          `);
          logInfo('Added edited_by_name column to programs_projects table', { context: 'database' });
        }
      } catch (error) {
        logError('Error adding edited_by_name column', error, { context: 'database' });
      }

      try {
        // Check if edited_by_role column exists
        const [editedRoleColumns] = await connection.query(`
          SELECT COLUMN_NAME 
          FROM INFORMATION_SCHEMA.COLUMNS 
          WHERE TABLE_SCHEMA = DATABASE() 
          AND TABLE_NAME = 'programs_projects' 
          AND COLUMN_NAME = 'edited_by_role'
        `);
        
        if (editedRoleColumns.length === 0) {
          await connection.query(`
            ALTER TABLE programs_projects 
            ADD COLUMN edited_by_role VARCHAR(100) NULL
          `);
          logInfo('Added edited_by_role column to programs_projects table', { context: 'database' });
        }
      } catch (error) {
        logError('Error adding edited_by_role column', error, { context: 'database' });
      }

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
          status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
          organization_id INT NOT NULL,
          created_by INT NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
          FOREIGN KEY (created_by) REFERENCES admins(id) ON DELETE CASCADE,
          INDEX idx_organization_id (organization_id),
          INDEX idx_created_by (created_by),
          INDEX idx_created_at (created_at),
          INDEX idx_status (status)
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
          heading TEXT NULL,
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
          description TEXT NULL,
          extension_categories JSON NULL,
          image_url VARCHAR(500) DEFAULT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        )
      `);
      
      // Migration: Remove heading column from about_us
      try {
        await connection.query(`ALTER TABLE about_us DROP COLUMN heading`);
      } catch (err) {
        // Column might not exist, ignore error
      }

      await connection.query(`
        CREATE TABLE IF NOT EXISTS mission_vision (
          id INT AUTO_INCREMENT PRIMARY KEY,
          type ENUM('mission', 'vision') NOT NULL,
          content TEXT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          INDEX idx_type (type)
        )
      `);
      
      // Migration: Allow NULL content for mission_vision (for empty fields)
      try {
        await connection.query(`ALTER TABLE mission_vision MODIFY COLUMN content TEXT NULL`);
      } catch (err) {
        // Column might already be NULL, ignore error
      }
      
      // Migration: Remove status column and index from mission_vision
      try {
        await connection.query(`ALTER TABLE mission_vision DROP INDEX idx_status`);
      } catch (err) {
        // Index might not exist, ignore error
      }
      try {
        await connection.query(`ALTER TABLE mission_vision DROP COLUMN status`);
      } catch (err) {
        // Column might not exist, ignore error
      }
      
      // Migration: Clean up duplicate mission/vision entries, keeping only the latest for each type
      try {
        // Get all entries grouped by type
        const [allEntries] = await connection.query(`
          SELECT * FROM mission_vision 
          WHERE type IN ('mission', 'vision') 
          ORDER BY type, id DESC
        `);
        
        const entriesByType = {
          mission: [],
          vision: []
        };
        
        allEntries.forEach(entry => {
          if (entry.type === 'mission' || entry.type === 'vision') {
            entriesByType[entry.type].push(entry);
          }
        });
        
        let deletedCount = 0;
        
        // For each type, keep only the latest entry (highest ID) and delete the rest
        for (const [type, entries] of Object.entries(entriesByType)) {
          if (entries.length > 1) {
            // Keep the first entry (latest/highest ID), delete the rest
            const duplicates = entries.slice(1);
            const duplicateIds = duplicates.map(entry => entry.id);
            
            if (duplicateIds.length > 0) {
              await connection.query(
                `DELETE FROM mission_vision WHERE id IN (${duplicateIds.map(() => '?').join(',')})`,
                duplicateIds
              );
              deletedCount += duplicateIds.length;
              logInfo(`Cleaned up ${duplicateIds.length} duplicate ${type} entries`, { context: 'database_migration', type });
            }
          }
        }
        
        if (deletedCount > 0) {
          logInfo(`Mission/Vision cleanup: Removed ${deletedCount} duplicate entries`, { context: 'database_migration' });
        }
      } catch (err) {
        // Log error but don't fail initialization
        logWarn('Warning: Could not clean up duplicate mission/vision entries', { context: 'database_migration', error: err.message });
      }
      
      // Migration: Clean up duplicate footer_content entries for contact information
      try {
        // Get all contact entries grouped by title (phone/email)
        const [allContactEntries] = await connection.query(`
          SELECT * FROM footer_content 
          WHERE section_type = 'contact' 
          ORDER BY title, id DESC
        `);
        
        const entriesByTitle = {
          phone: [],
          email: []
        };
        
        allContactEntries.forEach(entry => {
          if (entry.title === 'phone' || entry.title === 'email') {
            entriesByTitle[entry.title].push(entry);
          }
        });
        
        let deletedCount = 0;
        
        // For each title, keep only the latest entry (highest ID) and delete the rest
        for (const [title, entries] of Object.entries(entriesByTitle)) {
          if (entries.length > 1) {
            // Keep the first entry (latest/highest ID), delete the rest
            const duplicates = entries.slice(1);
            const duplicateIds = duplicates.map(entry => entry.id);
            
            if (duplicateIds.length > 0) {
              await connection.query(
                `DELETE FROM footer_content WHERE id IN (${duplicateIds.map(() => '?').join(',')})`,
                duplicateIds
              );
              deletedCount += duplicateIds.length;
              logInfo(`Cleaned up ${duplicateIds.length} duplicate ${title} contact entries`, { context: 'database_migration', title });
            }
          }
        }
        
        if (deletedCount > 0) {
          logInfo(`Footer Content cleanup: Removed ${deletedCount} duplicate contact entries`, { context: 'database_migration' });
        }
      } catch (err) {
        // Log error but don't fail initialization
        logWarn('Warning: Could not clean up duplicate footer_content entries', { context: 'database_migration', error: err.message });
      }
      
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
          id INT PRIMARY KEY DEFAULT 1,
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

      // Auto-insert/update superadmin account
      try {
        const superadminEmail = 'faithcommunityfaces@gmail.com';
        const superadminPassword = 'admin123'; // Easy password as requested
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(superadminPassword, saltRounds);

        // Check if superadmin exists
        const [existingSuperadmin] = await connection.query(
          'SELECT id, username, password FROM superadmin WHERE id = 1'
        );

        if (existingSuperadmin.length === 0) {
          // Insert new superadmin account
          await connection.query(
            `INSERT INTO superadmin (id, username, password, password_changed_at) 
             VALUES (1, ?, ?, NOW()) 
             ON DUPLICATE KEY UPDATE username = ?, password = ?, password_changed_at = NOW()`,
            [superadminEmail, hashedPassword, superadminEmail, hashedPassword]
          );
          logInfo('Superadmin account created successfully', { 
            context: 'database', 
            email: superadminEmail 
          });
        } else {
          // Update existing superadmin if password is NULL or empty
          const existing = existingSuperadmin[0];
          if (!existing.password || existing.password.trim() === '') {
            await connection.query(
              `UPDATE superadmin 
               SET username = ?, password = ?, password_changed_at = NOW() 
               WHERE id = 1`,
              [superadminEmail, hashedPassword]
            );
            logInfo('Superadmin account password updated successfully', { 
              context: 'database', 
              email: superadminEmail 
            });
          } else {
            // Update username if it doesn't match (but keep existing password)
            if (existing.username !== superadminEmail) {
              await connection.query(
                `UPDATE superadmin SET username = ? WHERE id = 1`,
                [superadminEmail]
              );
              logInfo('Superadmin account username updated', { 
                context: 'database', 
                email: superadminEmail 
              });
            } else {
              logInfo('Superadmin account already exists with password', { 
                context: 'database', 
                email: superadminEmail 
              });
            }
          }
        }
      } catch (superadminError) {
        // Log error but don't fail initialization
        logError('Failed to setup superadmin account', superadminError, { 
          context: 'database' 
        });
      }

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

      // Footer content (phone, email, copyright) - no auto-insert, let users add them
      // Removed auto-insert to allow null values initially

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

      // Mission/Vision - no auto-insert, let users add them manually
      // Removed auto-insert to allow empty values initially

      // Extension categories (about_us) - no auto-insert, let users add them manually
      // Removed auto-insert to allow empty values initially
      
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
        // Use a simpler approach to avoid MySQL subquery limitations
        try {
          const [duplicateSlugs] = await connection.query(`
            SELECT slug, COUNT(*) as count 
            FROM news 
            GROUP BY slug 
            HAVING count > 1
          `);
          
          for (const dup of duplicateSlugs) {
            const [records] = await connection.query(`
              SELECT id FROM news WHERE slug = ? ORDER BY id ASC
            `, [dup.slug]);
            
            // Keep first record, update the rest
            for (let i = 1; i < records.length; i++) {
              await connection.query(`
                UPDATE news SET slug = CONCAT(?, '-', id) WHERE id = ?
              `, [dup.slug, records[i].id]);
            }
          }
        } catch (slugError) {
          // Slug cleanup failed, log but don't fail migration
          logInfo('Slug duplicate cleanup failed (non-critical)', { context: 'database', error: slugError.message });
        }

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

    logInfo('Database initialization completed successfully', { context: 'database' });
    return promisePool;
  } catch (error) {
    // Provide detailed error information
    const errorDetails = {
      message: error.message,
      code: error.code,
      errno: error.errno,
      sqlState: error.sqlState,
      sqlMessage: error.sqlMessage,
      host: dbConfig.host,
      database: dbConfig.database,
      user: dbConfig.user,
      ssl: dbConfig.ssl ? 'enabled' : 'disabled'
    };
    
    logError('Database initialization failed', error, { 
      context: 'database',
      details: errorDetails
    });
    
    // Re-throw with helpful message
    if (error.originalError) {
      throw error; // Already has helpful message from testConnection
    }
    
    // Create helpful error message
    let helpfulMessage = `Database initialization failed: ${error.message}\n\n`;
    helpfulMessage += `Troubleshooting steps:\n`;
    helpfulMessage += `1. Verify MySQL service is running in Railway\n`;
    helpfulMessage += `2. Check environment variables are set correctly\n`;
    helpfulMessage += `3. For Railway MySQL, ensure MYSQL_SSL=true is set\n`;
    helpfulMessage += `4. Verify database credentials match MySQL service variables\n`;
    
    const dbError = new Error(helpfulMessage);
    dbError.originalError = error;
    throw dbError;
  } finally {
    connection.release();
  }
};

// Track initialization state
let initializationPromise = null;
let initializationComplete = false;
let initializationError = null;

// Initialize database with better error handling
const startInitialization = async () => {
  if (initializationPromise) {
    return initializationPromise;
  }
  
  initializationPromise = initializeDatabase()
    .then(() => {
      initializationComplete = true;
      initializationError = null;
      logInfo('✅ Database initialized successfully', { context: 'database' });
    })
    .catch(error => {
      initializationComplete = false;
      initializationError = error;
      logError('❌ Database initialization failed', error, { context: 'database' });
      
      // In production, exit with error code
      if (process.env.NODE_ENV === 'production') {
        console.error('\n❌ Database initialization failed. Application cannot start.\n');
        console.error('Please check your environment variables and MySQL service status in Railway.\n');
        process.exit(1);
      } else {
        // In development, log but don't exit (allows for debugging)
        console.error('\n⚠️  Database initialization failed. Application may not work correctly.\n');
      }
      
      throw error;
    });
  
  return initializationPromise;
};

// Start initialization immediately (non-blocking)
startInitialization().catch(() => {
  // Error already logged and handled above
});

// Export the promise pool for backward compatibility
// Note: Wait for initialization before using the pool
export const getDatabase = async () => {
  if (!initializationComplete && !initializationError) {
    // Wait for initialization to complete
    await initializationPromise;
  }
  
  if (initializationError) {
    throw initializationError;
  }
  
  return promisePool;
};

// Export promise pool directly (for backward compatibility)
// Warning: This may be used before initialization completes
export default promisePool;

// Export initialization status
export const isDatabaseReady = () => initializationComplete;
export const getInitializationError = () => initializationError;