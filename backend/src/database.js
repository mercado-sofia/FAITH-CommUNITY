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
  }
};

// Database configuration loaded

// Create a connection pool
const pool = mysql.createPool(dbConfig);
const promisePool = pool.promise();

// Initialize database function
const initializeDatabase = async () => {
  try {
    const connection = await promisePool.getConnection();

    // Note: featured_projects table has been consolidated into programs_projects.is_featured column
    // The old featured_projects table is no longer needed and should be removed if it exists
    
    // Migration: Remove old featured_projects table if it exists (after data migration)
    const [oldFeaturedTables] = await connection.query('SHOW TABLES LIKE "featured_projects"');
    if (oldFeaturedTables.length > 0) {
      
      // Check if there are any records in the old table
      const [oldRecords] = await connection.query('SELECT COUNT(*) as count FROM featured_projects');
      
      if (oldRecords[0].count > 0) {
      } else {
        try {
          await connection.query('DROP TABLE featured_projects');
        } catch (error) {
          // Could not remove old featured_projects table
        }
      }
    }

    // Check if news table exists
    const [newsTables] = await connection.query('SHOW TABLES LIKE "news"');
    
    if (newsTables.length === 0) {
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
          updated_at TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
          FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE
        )
      `);
    } else {
      // Check if deleted_at column exists, add it if missing
      const [deletedAtColumn] = await connection.query(`
        SELECT COLUMN_NAME 
        FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_NAME = 'news' 
        AND COLUMN_NAME = 'deleted_at'
      `);
      
      if (deletedAtColumn.length === 0) {
        await connection.query(`
          ALTER TABLE news 
          ADD COLUMN deleted_at TIMESTAMP NULL,
          ADD COLUMN is_deleted BOOLEAN DEFAULT FALSE
        `);
      }

      // Check if enhanced news columns exist, add them if missing
      const [enhancedColumns] = await connection.query(`
        SELECT COLUMN_NAME 
        FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_NAME = 'news' 
        AND COLUMN_NAME IN ('slug', 'content', 'excerpt', 'featured_image', 'published_at')
      `);
      
      if (enhancedColumns.length < 5) {
        
        // Add columns one by one to handle existing columns gracefully
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
            }
          }
        }

        // Migrate existing data
        
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

        // Add indexes for better performance
        try {
          await connection.query('CREATE INDEX idx_news_slug ON news(slug)');
        } catch (error) {
          if (error.code !== 'ER_DUP_KEYNAME') {
          }
        }

        try {
          await connection.query('CREATE INDEX idx_news_published_at ON news(published_at)');
        } catch (error) {
          if (error.code !== 'ER_DUP_KEYNAME') {
          }
        }

      }

      // Check if updated_at column needs to be fixed (set to NULL by default instead of CURRENT_TIMESTAMP)
      const [updatedAtColumn] = await connection.query(`
        SELECT COLUMN_DEFAULT, IS_NULLABLE
        FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_NAME = 'news' 
        AND COLUMN_NAME = 'updated_at'
      `);
      
      if (updatedAtColumn.length > 0 && updatedAtColumn[0].COLUMN_DEFAULT === 'CURRENT_TIMESTAMP') {
        // First, set all existing updated_at values to NULL where they equal created_at
        await connection.query(`
          UPDATE news 
          SET updated_at = NULL 
          WHERE updated_at = created_at
        `);
        
        // Then modify the column definition
        await connection.query(`
          ALTER TABLE news 
          MODIFY COLUMN updated_at TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP
        `);
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
      await connection.query(`
        ALTER TABLE admins 
        ADD COLUMN organization_id INT NULL,
        ADD CONSTRAINT fk_admins_organization 
        FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE SET NULL
      `);
      
      // Check if there are existing admins that need organization records
      const [existingAdmins] = await connection.query(`
        SELECT COUNT(*) as count FROM admins WHERE organization_id IS NULL
      `);
      
      if (existingAdmins[0].count > 0) {
              // Found existing admins without organization records - sync endpoint available
      }
    } else {
      // organization_id column already exists in admins table
    }

    // Check if password_changed_at column exists in admins table, add it if missing
    const [passwordChangedAtColumn] = await connection.query(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'admins' 
      AND COLUMN_NAME = 'password_changed_at'
    `);
    
    if (passwordChangedAtColumn.length === 0) {
      await connection.query(`
        ALTER TABLE admins 
        ADD COLUMN password_changed_at TIMESTAMP NULL DEFAULT NULL
      `);
    } else {
      // password_changed_at column already exists in admins table
    }

    // Check if updated_at column exists in admins table, add it if missing
    const [updatedAtColumn] = await connection.query(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'admins' 
      AND COLUMN_NAME = 'updated_at'
    `);
    
    if (updatedAtColumn.length === 0) {
      await connection.query(`
        ALTER TABLE admins 
        ADD COLUMN updated_at TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP
      `);
    } else {
      // updated_at column already exists in admins table
    }

    // Migration: Move org and orgName from admins to organizations table
    const [orgColumns] = await connection.query(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'organizations' 
      AND COLUMN_NAME IN ('org', 'orgName')
    `);
    
    if (orgColumns.length < 2) {
      await connection.query(`
        ALTER TABLE organizations 
        ADD COLUMN org VARCHAR(50) NULL UNIQUE,
        ADD COLUMN orgName VARCHAR(255) NULL
      `);
      
      // Migrate existing data from admins to organizations
      await connection.query(`
        UPDATE organizations o
        INNER JOIN admins a ON o.id = a.organization_id
        SET o.org = a.org, o.orgName = a.orgName
        WHERE a.org IS NOT NULL AND a.orgName IS NOT NULL
      `);
      
      // Remove org and orgName columns from admins table after migration
      try {
        await connection.query(`
          ALTER TABLE admins 
          DROP COLUMN org,
          DROP COLUMN orgName
        `);
      } catch (error) {
        if (error.code === 'ER_CANT_DROP_FIELD_OR_KEY') {
          // org and orgName columns not found in admins table (already removed)
        } else {
          // Could not remove org and orgName columns from admins table
        }
      }
    }

    // Create admin_invitations table for invitation system
    const [invitationTables] = await connection.query('SHOW TABLES LIKE "admin_invitations"');
    
    if (invitationTables.length === 0) {
      await connection.query(`
        CREATE TABLE admin_invitations (
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
    }

    // Check if programs_projects table has date fields, add them if missing
    const [dateColumns] = await connection.query(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'programs_projects' 
      AND COLUMN_NAME IN ('event_start_date', 'event_end_date')
    `);
    
    if (dateColumns.length === 0) {
      await connection.query(`
        ALTER TABLE programs_projects 
        ADD COLUMN event_start_date DATE NULL,
        ADD COLUMN event_end_date DATE NULL
      `);
    }

    // Check if programs_projects table has slug field, add it if missing
    const [slugColumns] = await connection.query(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'programs_projects' 
      AND COLUMN_NAME = 'slug'
    `);
    
    if (slugColumns.length === 0) {
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
      
      
      // Add index for better performance
      try {
        await connection.query('CREATE INDEX idx_programs_slug ON programs_projects(slug)');
      } catch (error) {
        if (error.code !== 'ER_DUP_KEYNAME') {
        }
      }
    }

    // Check if program_event_dates table exists
    const [eventDatesTables] = await connection.query('SHOW TABLES LIKE "program_event_dates"');
    
    if (eventDatesTables.length === 0) {
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
    }

    // Check if program_additional_images table exists
    const [additionalImagesTables] = await connection.query('SHOW TABLES LIKE "program_additional_images"');
    
    if (additionalImagesTables.length === 0) {
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
    }

    // Add featured column to programs_projects table if it doesn't exist
    try {
      // Checking for featured column in programs_projects table...
      await connection.query(`
        ALTER TABLE programs_projects 
        ADD COLUMN is_featured BOOLEAN DEFAULT FALSE
      `);
    } catch (error) {
      if (error.code !== 'ER_DUP_FIELDNAME') {
        // is_featured column already exists in programs_projects table
      }
    }

    // Add is_approved column to programs_projects table if it doesn't exist
    try {
      // Checking for is_approved column in programs_projects table...
      await connection.query(`
        ALTER TABLE programs_projects 
        ADD COLUMN is_approved BOOLEAN DEFAULT TRUE
      `);
    } catch (error) {
      if (error.code !== 'ER_DUP_FIELDNAME') {
        // is_approved column already exists in programs_projects table
      }
    }

    // Note: featured_projects table migration code removed - now using programs_projects.is_featured

    // Check if faqs table exists
    const [faqsTables] = await connection.query('SHOW TABLES LIKE "faqs"');
    
    if (faqsTables.length === 0) {
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
    }

    // Check if submissions table exists
    const [submissionsTables] = await connection.query('SHOW TABLES LIKE "submissions"');
    
    if (submissionsTables.length === 0) {
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
    }

    // Check if program_collaborations table exists
    const [collaborationsTables] = await connection.query('SHOW TABLES LIKE "program_collaborations"');
    
    if (collaborationsTables.length === 0) {
      await connection.query(`
        CREATE TABLE program_collaborations (
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
    }

    // Add is_collaborative column to programs_projects table if it doesn't exist
    try {
      await connection.query(`
        ALTER TABLE programs_projects 
        ADD COLUMN is_collaborative BOOLEAN DEFAULT FALSE
      `);
    } catch (error) {
      if (error.code !== 'ER_DUP_FIELDNAME') {
        // is_collaborative column already exists in programs_projects table
      }
    }

    // Migrate existing program_collaborations table to remove 'pending' status
    try {
      // First, update any 'pending' status to 'accepted' (auto-accept model)
      await connection.query(`
        UPDATE program_collaborations 
        SET status = 'accepted' 
        WHERE status = 'pending'
      `);
      
      // Then modify the column to remove 'pending' from ENUM
      await connection.query(`
        ALTER TABLE program_collaborations 
        MODIFY COLUMN status ENUM('accepted', 'declined') DEFAULT 'accepted'
      `);
    } catch (error) {
      // Migration failed - table might not exist yet or already migrated
    }

    // Check if messages table exists
    const [messagesTables] = await connection.query('SHOW TABLES LIKE "messages"');
    
    if (messagesTables.length === 0) {
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
    } else {
      // Messages table already exists
      
      // Check if user_id column exists, if not add it
      const [userIdColumn] = await connection.query(
        "SHOW COLUMNS FROM messages LIKE 'user_id'"
      );
      
      if (userIdColumn.length === 0) {
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
      
      // Keep sender_email for unauth users, but remove sender_name since we get it from users table
      const [senderNameColumn] = await connection.query(
        "SHOW COLUMNS FROM messages LIKE 'sender_name'"
      );
      
      if (senderNameColumn.length > 0) {
        await connection.query(`
          ALTER TABLE messages 
          DROP COLUMN sender_name
        `);
      }
    }

    // Check if admin_notifications table exists
    const [adminNotificationsTables] = await connection.query('SHOW TABLES LIKE "admin_notifications"');
    
    if (adminNotificationsTables.length === 0) {
      await connection.query(`
        CREATE TABLE admin_notifications (
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
    } else {
      // Check if 'message' type exists in the ENUM
      const [columnInfo] = await connection.query(`
        SELECT COLUMN_TYPE 
        FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_NAME = 'admin_notifications' 
        AND COLUMN_NAME = 'type'
      `);
      
      if (columnInfo.length > 0 && !columnInfo[0].COLUMN_TYPE.includes("'message'")) {
        await connection.query(`
          ALTER TABLE admin_notifications 
          MODIFY COLUMN type ENUM('approval', 'decline', 'system', 'message', 'collaboration', 'program_approval') NOT NULL
        `);
      }
      
      // Check if collaboration and program_approval types exist, add them if missing
      if (columnInfo.length > 0 && (!columnInfo[0].COLUMN_TYPE.includes("'collaboration'") || !columnInfo[0].COLUMN_TYPE.includes("'program_approval'"))) {
        await connection.query(`
          ALTER TABLE admin_notifications 
          MODIFY COLUMN type ENUM('approval', 'decline', 'system', 'message', 'collaboration', 'program_approval') NOT NULL
        `);
      }
    }

    // Check if superadmin_notifications table exists
    const [superadminNotificationsTables] = await connection.query('SHOW TABLES LIKE "superadmin_notifications"');
    
    if (superadminNotificationsTables.length === 0) {
      await connection.query(`
        CREATE TABLE superadmin_notifications (
          id INT AUTO_INCREMENT PRIMARY KEY,
          superadmin_id INT NOT NULL,
          type ENUM('approval_request', 'decline', 'system', 'message') NOT NULL,
          title VARCHAR(255) NOT NULL,
          message TEXT NOT NULL,
          section VARCHAR(100),
          submission_id INT,
          organization_id INT,
          is_read BOOLEAN DEFAULT FALSE,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          INDEX idx_superadmin_read (superadmin_id, is_read),
          INDEX idx_created_at (created_at),
          INDEX idx_organization (organization_id),
          FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE SET NULL
        )
      `);
    } else {
      // Check if organization_id column exists, if not add it and migrate data
      const [columnExists] = await connection.query(`
        SELECT COLUMN_NAME 
        FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_NAME = 'superadmin_notifications' 
        AND COLUMN_NAME = 'organization_id'
      `);
      
      if (columnExists.length === 0) {
        
        // Add organization_id column
        await connection.query(`
          ALTER TABLE superadmin_notifications 
          ADD COLUMN organization_id INT AFTER submission_id
        `);
        
        // Add foreign key constraint
        await connection.query(`
          ALTER TABLE superadmin_notifications 
          ADD CONSTRAINT fk_notifications_organization 
          FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE SET NULL
        `);
        
        // Add index
        await connection.query(`
          ALTER TABLE superadmin_notifications 
          ADD INDEX idx_organization (organization_id)
        `);
        
        // Migrate existing data: populate organization_id from organization_acronym
        await connection.query(`
          UPDATE superadmin_notifications sn
          LEFT JOIN organizations o ON LOWER(TRIM(sn.organization_acronym)) = LOWER(TRIM(o.org))
          SET sn.organization_id = o.id
          WHERE sn.organization_acronym IS NOT NULL
        `);
        
        // Drop old columns after successful migration
        try {
          await connection.query(`
            ALTER TABLE superadmin_notifications 
            DROP COLUMN organization_acronym
          `);
        } catch (dropError) {
        }
        
        try {
          await connection.query(`
            ALTER TABLE superadmin_notifications 
            DROP COLUMN organization_logo
          `);
        } catch (dropError) {
        }
        
      } else {
        // organization_id column already exists, check if old columns need cleanup
        const [oldColumns] = await connection.query(`
          SELECT COLUMN_NAME 
          FROM INFORMATION_SCHEMA.COLUMNS 
          WHERE TABLE_NAME = 'superadmin_notifications' 
          AND COLUMN_NAME IN ('organization_acronym', 'organization_logo')
        `);
        
        if (oldColumns.length > 0) {
          for (const column of oldColumns) {
            try {
              await connection.query(`
                ALTER TABLE superadmin_notifications 
                DROP COLUMN ${column.COLUMN_NAME}
              `);
            } catch (dropError) {
            }
          }
        }
      }
      
      // Check if message_template column exists, add it if missing
      const [messageTemplateColumn] = await connection.query(`
        SELECT COLUMN_NAME 
        FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_NAME = 'superadmin_notifications' 
        AND COLUMN_NAME = 'message_template'
      `);
      
      if (messageTemplateColumn.length === 0) {
        
        // Add message_template column
        await connection.query(`
          ALTER TABLE superadmin_notifications 
          ADD COLUMN message_template TEXT AFTER message
        `);
        
        // Migrate existing messages to templates
        await connection.query(`
          UPDATE superadmin_notifications 
          SET message_template = message
          WHERE message_template IS NULL
        `);
        
      }
    }

    // Check if password_reset_tokens table exists
    const [passwordResetTables] = await connection.query('SHOW TABLES LIKE "password_reset_tokens"');
    
    if (passwordResetTables.length === 0) {
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
    }

    // Check if refresh_tokens table exists
    const [refreshTokensTable] = await connection.query('SHOW TABLES LIKE "refresh_tokens"');
    if (refreshTokensTable.length === 0) {
      // Creating refresh_tokens table...");
      await connection.query(`
        CREATE TABLE refresh_tokens (
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
      // ✅ refresh_tokens table created successfully!");
    }

    // Check if volunteers table exists
    const [volunteersTables] = await connection.query('SHOW TABLES LIKE "volunteers"');
    
    if (volunteersTables.length === 0) {
      // Creating volunteers table...");
      await connection.query(`
        CREATE TABLE volunteers (
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
      // ✅ Volunteers table created successfully!");
    } else {
      // Check if volunteers table needs migration to include 'Completed' status
      const [statusColumn] = await connection.query(`
        SELECT COLUMN_TYPE FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_NAME = 'volunteers' AND COLUMN_NAME = 'status' AND TABLE_SCHEMA = DATABASE()
      `);
      
      if (statusColumn.length > 0 && !statusColumn[0].COLUMN_TYPE.includes('Completed')) {
        // Updating volunteers table to include 'Completed' status...");
        await connection.query(`
          ALTER TABLE volunteers 
          MODIFY COLUMN status ENUM('Pending', 'Approved', 'Declined', 'Cancelled', 'Completed') 
          DEFAULT 'Pending'
        `);
        // ✅ Volunteers table updated with 'Completed' status!");
      }
      
      // Check if volunteers table needs migration to new structure
      const [oldStructureColumns] = await connection.query(`
        SELECT COLUMN_NAME 
        FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_NAME = 'volunteers' 
        AND COLUMN_NAME IN ('full_name', 'age', 'gender', 'email', 'phone_number', 'address', 'occupation', 'citizenship', 'valid_id')
      `);
      
      if (oldStructureColumns.length > 0) {
        // Migrating volunteers table to new structure...");
        
        // Create new volunteers table with new structure
        await connection.query(`
          CREATE TABLE volunteers_new (
            id INT AUTO_INCREMENT PRIMARY KEY,
            user_id INT NOT NULL,
            program_id INT NOT NULL,
            reason TEXT NOT NULL,
            status ENUM('Pending', 'Approved', 'Declined', 'Cancelled') DEFAULT 'Pending',
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
        
        // ✅ Volunteers table migrated to new structure!");
      }
      
      // Check if volunteers table needs 'Cancelled' status added
      const [cancelledStatusColumn] = await connection.query(`
        SELECT COLUMN_TYPE 
        FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_NAME = 'volunteers' 
        AND COLUMN_NAME = 'status'
      `);
      
      if (cancelledStatusColumn.length > 0 && !cancelledStatusColumn[0].COLUMN_TYPE.includes('Cancelled')) {
        // Adding 'Cancelled' status to volunteers table...");
        await connection.query(`
          ALTER TABLE volunteers 
          MODIFY COLUMN status ENUM('Pending', 'Approved', 'Declined', 'Cancelled') DEFAULT 'Pending'
        `);
        // ✅ 'Cancelled' status added to volunteers table!");
      }
    }

    // Check if users table exists
    const [usersTables] = await connection.query('SHOW TABLES LIKE "users"');
    
    if (usersTables.length === 0) {
      // Creating users table...");
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
      // ✅ Users table created successfully!");
    } else {
      // Check if password_hash column exists, add it if missing
      const [passwordHashColumn] = await connection.query(`
        SELECT COLUMN_NAME 
        FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_NAME = 'users' 
        AND COLUMN_NAME = 'password_hash'
      `);
      
      if (passwordHashColumn.length === 0) {
        // Adding password_hash column to users table...");
        await connection.query(`
          ALTER TABLE users 
          ADD COLUMN password_hash VARCHAR(255) NOT NULL AFTER email
        `);
        // ✅ password_hash column added to users table!");
      }

      // Check if is_active column exists, add it if missing
      const [isActiveColumn] = await connection.query(`
        SELECT COLUMN_NAME 
        FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_NAME = 'users' 
        AND COLUMN_NAME = 'is_active'
      `);
      
      if (isActiveColumn.length === 0) {
        // Adding is_active column to users table...");
        await connection.query(`
          ALTER TABLE users 
          ADD COLUMN is_active TINYINT(1) DEFAULT 1
        `);
        // ✅ is_active column added to users table!");
      }

      // Check if email_verified column exists, add it if missing
      const [emailVerifiedColumn] = await connection.query(`
        SELECT COLUMN_NAME 
        FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_NAME = 'users' 
        AND COLUMN_NAME = 'email_verified'
      `);
      
      if (emailVerifiedColumn.length === 0) {
        // Adding email_verified column to users table...");
        await connection.query(`
          ALTER TABLE users 
          ADD COLUMN email_verified TINYINT(1) DEFAULT 0
        `);
        // ✅ email_verified column added to users table!");
      }

      // Check if verification_token column exists, add it if missing
      const [verificationTokenColumn] = await connection.query(`
        SELECT COLUMN_NAME 
        FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_NAME = 'users' 
        AND COLUMN_NAME = 'verification_token'
      `);
      
      if (verificationTokenColumn.length === 0) {
        // Adding verification_token column to users table...");
        await connection.query(`
          ALTER TABLE users 
          ADD COLUMN verification_token VARCHAR(255) NULL,
          ADD COLUMN verification_token_expires TIMESTAMP NULL
        `);
        // ✅ verification_token columns added to users table!");
      }

      // Check if full_name column exists, add it if missing
      const [fullNameColumn] = await connection.query(`
        SELECT COLUMN_NAME 
        FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_NAME = 'users' 
        AND COLUMN_NAME = 'full_name'
      `);
      
      if (fullNameColumn.length === 0) {
        // Adding full_name column to users table...");
        await connection.query(`
          ALTER TABLE users 
          ADD COLUMN full_name VARCHAR(200) GENERATED ALWAYS AS (CONCAT(first_name, ' ', last_name)) STORED
        `);
        // ✅ full_name column added to users table!");
      }

      // Check if verification_token index exists, add it if missing
      const [verificationTokenIndex] = await connection.query(`
        SELECT INDEX_NAME 
        FROM INFORMATION_SCHEMA.STATISTICS 
        WHERE TABLE_NAME = 'users' 
        AND INDEX_NAME = 'idx_verification_token'
      `);
      
      if (verificationTokenIndex.length === 0) {
        // Adding verification_token index to users table...");
        await connection.query(`
          ALTER TABLE users 
          ADD INDEX idx_verification_token (verification_token)
        `);
        // ✅ verification_token index added to users table!");
      }

      // Check if email_verified index exists, add it if missing
      const [emailVerifiedIndex] = await connection.query(`
        SELECT INDEX_NAME 
        FROM INFORMATION_SCHEMA.STATISTICS 
        WHERE TABLE_NAME = 'users' 
        AND INDEX_NAME = 'idx_email_verified'
      `);
      
      if (emailVerifiedIndex.length === 0) {
        // Adding email_verified index to users table...");
        await connection.query(`
          ALTER TABLE users 
          ADD INDEX idx_email_verified (email_verified)
        `);
        // ✅ email_verified index added to users table!");
      }

      // Check if newsletter_subscribed column exists, add it if missing
      const [newsletterSubscribedColumn] = await connection.query(`
        SELECT COLUMN_NAME 
        FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_NAME = 'users' 
        AND COLUMN_NAME = 'newsletter_subscribed'
      `);
      
      if (newsletterSubscribedColumn.length === 0) {
        // Adding newsletter_subscribed column to users table...");
        await connection.query(`
          ALTER TABLE users 
          ADD COLUMN newsletter_subscribed TINYINT(1) DEFAULT 0
        `);
        // ✅ newsletter_subscribed column added to users table!");
      }

      // Check if profile_photo_url column exists, add it if missing
      const [profilePhotoUrlColumn] = await connection.query(`
        SELECT COLUMN_NAME 
        FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_NAME = 'users' 
        AND COLUMN_NAME = 'profile_photo_url'
      `);
      
      if (profilePhotoUrlColumn.length === 0) {
        // Adding profile_photo_url column to users table...");
        await connection.query(`
          ALTER TABLE users 
          ADD COLUMN profile_photo_url VARCHAR(500)
        `);
        // ✅ profile_photo_url column added to users table!");
      }

      // Check if user_notifications table exists
      const [userNotificationsTable] = await connection.query('SHOW TABLES LIKE "user_notifications"');
      
      if (userNotificationsTable.length === 0) {
        // Creating user_notifications table...");
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
        // ✅ user_notifications table created successfully!");
      }

      // Check if subscribers table exists
      const [subscribersTable] = await connection.query('SHOW TABLES LIKE "subscribers"');
      
      if (subscribersTable.length === 0) {
        // Creating subscribers table...");
        await connection.query(`
          CREATE TABLE subscribers (
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
        // ✅ subscribers table created successfully!");
      } else {
        // Check and fix the is_verified column default value
        // Checking subscribers table structure...
        
        // First, check if verified_at column exists
        const [verifiedAtColumn] = await connection.query(`
          SELECT COLUMN_NAME 
          FROM INFORMATION_SCHEMA.COLUMNS 
          WHERE TABLE_NAME = 'subscribers' 
          AND COLUMN_NAME = 'verified_at'
        `);
        
        if (verifiedAtColumn.length === 0) {
          // Adding missing verified_at column to subscribers table...");
          await connection.query(`
            ALTER TABLE subscribers 
            ADD COLUMN verified_at TIMESTAMP NULL
          `);
          // ✅ verified_at column added successfully!");
        }
        
        const [isVerifiedColumn] = await connection.query(`
          SELECT COLUMN_DEFAULT 
          FROM INFORMATION_SCHEMA.COLUMNS 
          WHERE TABLE_NAME = 'subscribers' 
          AND COLUMN_NAME = 'is_verified'
        `);
        
        if (isVerifiedColumn.length > 0 && isVerifiedColumn[0].COLUMN_DEFAULT !== '0') {
          // Fixing is_verified column default value...");
          await connection.query(`
            ALTER TABLE subscribers 
            MODIFY COLUMN is_verified TINYINT(1) DEFAULT 0
          `);
          // ✅ is_verified column default value fixed!");
        }
        
        // Check if there are any verified subscriptions that shouldn't be verified
        const [verifiedSubs] = await connection.query(`
          SELECT COUNT(*) as count FROM subscribers 
          WHERE is_verified = 1 AND verified_at IS NULL
        `);
        
        if (verifiedSubs[0].count > 0) {
          // Found ${verifiedSubs[0].count} incorrectly verified subscriptions, fixing...`);
          await connection.query(`
            UPDATE subscribers 
            SET is_verified = 0 
            WHERE is_verified = 1 AND verified_at IS NULL
          `);
          // ✅ Incorrectly verified subscriptions fixed!");
        }
        
        // Force update the column default value to ensure it's 0
        // Ensuring is_verified column has correct default value...
        try {
          await connection.query(`
            ALTER TABLE subscribers 
            MODIFY COLUMN is_verified TINYINT(1) DEFAULT 0 NOT NULL
          `);
          // is_verified column default value enforced
        } catch (alterError) {
          // ℹ️ Column modification not needed or failed (this is normal):", alterError.message);
        }
        
        // Also check if there are any existing subscriptions that need fixing
        const [allSubs] = await connection.query(`
          SELECT id, email, is_verified, verified_at 
          FROM subscribers 
          WHERE verified_at IS NULL
        `);
        
        if (allSubs.length > 0) {
          // Found ${allSubs.length} subscriptions without verification timestamp, ensuring they are unverified...`);
          await connection.query(`
            UPDATE subscribers 
            SET is_verified = 0 
            WHERE verified_at IS NULL
          `);
          // ✅ All unverified subscriptions properly marked!");
        }
      }
    }

    // Migration: Update admins table - replace status column with is_active boolean
    
    // Check if status column exists and is_active doesn't exist
    const [statusColumn] = await connection.query(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'admins' 
      AND COLUMN_NAME = 'status'
    `);
    
    const [isActiveColumn] = await connection.query(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'admins' 
      AND COLUMN_NAME = 'is_active'
    `);
    
    if (statusColumn.length > 0 && isActiveColumn.length === 0) {
      // Migrating admins table: replacing status column with is_active boolean...");
      
      // Add is_active column first
      await connection.query(`
        ALTER TABLE admins 
        ADD COLUMN is_active BOOLEAN DEFAULT TRUE
      `);
      
      // Migrate data: ACTIVE -> TRUE, INACTIVE -> FALSE
      await connection.query(`
        UPDATE admins 
        SET is_active = CASE 
          WHEN status = 'ACTIVE' THEN TRUE 
          WHEN status = 'INACTIVE' THEN FALSE 
          ELSE TRUE 
        END
      `);
      
      // Remove the old status column
      await connection.query(`
        ALTER TABLE admins 
        DROP COLUMN status
      `);
      
      // ✅ Admins table migration completed: status column replaced with is_active boolean!");
    } else if (isActiveColumn.length > 0) {
      // ✅ Admins table already has is_active column");
    } else {
      // ℹ️ Admins table structure check completed");
    }


    // Add 2FA columns to superadmin table for TOTP implementation
    try {
      await connection.query(`ALTER TABLE superadmin ADD COLUMN twofa_enabled TINYINT(1) DEFAULT 0`)
    } catch (e) {}
    try {
      await connection.query(`ALTER TABLE superadmin ADD COLUMN twofa_secret VARCHAR(255) NULL`)
    } catch (e) {}

    // Check if branding table exists
    const [brandingTables] = await connection.query('SHOW TABLES LIKE "branding"');
    
    if (brandingTables.length === 0) {
      // Creating branding table...");
      await connection.query(`
        CREATE TABLE branding (
          id INT AUTO_INCREMENT PRIMARY KEY,
          logo_url VARCHAR(500) NULL,
          name_url VARCHAR(500) NULL,
          favicon_url VARCHAR(500) NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        )
      `);
      
      // Insert default branding record
      await connection.query(`
        INSERT INTO branding (logo_url, name_url, favicon_url) 
        VALUES (NULL, NULL, NULL)
      `);
      
      // ✅ Branding table created successfully!");
    } else {
      // ✅ Branding table already exists");
      
      // Check if name_url column exists, if not add it
      try {
        const [columns] = await connection.query("SHOW COLUMNS FROM branding LIKE 'name_url'");
        if (columns.length === 0) {
          // Adding name_url column to branding table...");
          await connection.query("ALTER TABLE branding ADD COLUMN name_url VARCHAR(500) NULL AFTER logo_url");
          // ✅ name_url column added successfully!");
        } else {
          // ✅ name_url column already exists");
        }
      } catch (e) {
      }
    }

    // Check if site_name table exists
    const [siteNameTables] = await connection.query('SHOW TABLES LIKE "site_name"');
    
    if (siteNameTables.length === 0) {
      // Creating site_name table...");
      await connection.query(`
        CREATE TABLE site_name (
          id INT AUTO_INCREMENT PRIMARY KEY,
          site_name VARCHAR(255) NOT NULL DEFAULT 'FAITH CommUNITY',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        )
      `);
      
      // Insert default site name record
      await connection.query(`
        INSERT INTO site_name (site_name) 
        VALUES ('FAITH CommUNITY')
      `);
      
      // ✅ Site name table created successfully!");
    } else {
      // ✅ Site name table already exists");
    }

    // Check if footer_content table exists
    const [footerContentTables] = await connection.query('SHOW TABLES LIKE "footer_content"');
    
    if (footerContentTables.length === 0) {
      // Creating footer_content table...");
      await connection.query(`
        CREATE TABLE footer_content (
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
      
      // Insert default footer content records
      await connection.query(`
        INSERT INTO footer_content (section_type, title, url, display_order) VALUES
        ('contact', 'phone', '+163-3654-7896', 1),
        ('contact', 'email', 'info@faithcommunity.com', 2),
        ('copyright', 'copyright', '© Copyright 2025 FAITH CommUNITY. All Rights Reserved.', 1)
      `);
      
      // ✅ Footer content table created successfully!");
    } else {
      // ✅ Footer content table already exists");
    }

    // Check if hero_section table exists
    const [heroSectionTables] = await connection.query('SHOW TABLES LIKE "hero_section"');
    
    if (heroSectionTables.length === 0) {
      // Creating hero_section table...");
      await connection.query(`
        CREATE TABLE hero_section (
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
      
      // Insert default hero section record
      await connection.query(`
        INSERT INTO hero_section (tag, heading) VALUES
        ('Welcome to FAITH CommUNITY', 'A Unified Platform for Community Extension Programs')
      `);
      
      // ✅ Hero section table created successfully!");
    } else {
      // ✅ Hero section table already exists");
      
      // Check if new columns exist and add them if they don't
      const [columns] = await connection.query(`
        SELECT COLUMN_NAME 
        FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_NAME = 'hero_section' 
        AND TABLE_SCHEMA = DATABASE()
      `);
      
      const columnNames = columns.map(col => col.COLUMN_NAME);
      
      if (!columnNames.includes('video_link')) {
        // Adding video_link column to hero_section table...");
        await connection.query(`
          ALTER TABLE hero_section 
          ADD COLUMN video_link VARCHAR(500) NULL AFTER video_url
        `);
      }
      
      if (!columnNames.includes('video_type')) {
        // Adding video_type column to hero_section table...");
        await connection.query(`
          ALTER TABLE hero_section 
          ADD COLUMN video_type ENUM('upload', 'link') DEFAULT 'upload' AFTER video_link
        `);
      }
    }

    // Check if hero_section_images table exists
    const [heroSectionImagesTables] = await connection.query('SHOW TABLES LIKE "hero_section_images"');
    
    if (heroSectionImagesTables.length === 0) {
      // Creating hero_section_images table...");
      await connection.query(`
        CREATE TABLE hero_section_images (
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
      
      // Insert default hero section images
      await connection.query(`
        INSERT INTO hero_section_images (image_id, heading, subheading, display_order) VALUES
        (1, 'Inside the Initiative', 'Where Ideas Take Root', 1),
        (2, 'Collaboration', 'Working Together', 2),
        (3, 'Innovation', 'Building the Future', 3)
      `);
      
      // ✅ Hero section images table created successfully!");
    } else {
      // ✅ Hero section images table already exists");
    }

    // Check if about_us table exists
    const [aboutUsTables] = await connection.query('SHOW TABLES LIKE "about_us"');
    
    if (aboutUsTables.length === 0) {
      // Creating about_us table...");
      await connection.query(`
        CREATE TABLE about_us (
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
      
      // Insert default about us record
      await connection.query(`
        INSERT INTO about_us (heading, description) VALUES
        ('We Believe That We Can Help More People With You', 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris.')
      `);
      
      // ✅ About us table created successfully!");
    } else {
      // ✅ About us table already exists");
      
      // Check if tag column exists and remove it (migration)
      try {
        const [columns] = await connection.query(`
          SELECT COLUMN_NAME 
          FROM INFORMATION_SCHEMA.COLUMNS 
          WHERE TABLE_SCHEMA = DATABASE() 
          AND TABLE_NAME = 'about_us' 
          AND COLUMN_NAME = 'tag'
        `);
        
        if (columns.length > 0) {
          // Removing tag column from about_us table...");
          await connection.query('ALTER TABLE about_us DROP COLUMN tag');
          // ✅ Tag column removed from about_us table!");
        }
      } catch (error) {
      }
    }

    // Check if heads_faces table exists
    const [headsFacesTables] = await connection.query('SHOW TABLES LIKE "heads_faces"');
    
    if (headsFacesTables.length === 0) {
      // Creating heads_faces table...");
      await connection.query(`
        CREATE TABLE heads_faces (
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
      
      // Insert default heads of FACES records
      await connection.query(`
        INSERT INTO heads_faces (name, description, email, phone, position, display_order) VALUES
        ('Jana Mae A. Cruz', 'Chair of the Community Extension Committee', 'jana.cruz@faith.edu.ph', '+63 912 345 6789', 'Chair', 1),
        ('Jana Mae A. Cruz', 'Organization Adviser for Community Extension', 'jana.cruz@faith.edu.ph', '+63 912 345 6789', 'Org Adviser', 2),
        ('Jana Mae A. Cruz', 'Secretary of the Community Extension Committee', 'jana.cruz@faith.edu.ph', '+63 912 345 6789', 'Secretary', 3)
      `);
      
      // ✅ Heads of FACES table created successfully!");
    } else {
      // ✅ Heads of FACES table already exists");
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
  // ✅ Database initialization completed!");
}).catch(error => {
  console.error("Database initialization failed:", error);
});

// Export the promise pool directly for backward compatibility
export default promisePool;