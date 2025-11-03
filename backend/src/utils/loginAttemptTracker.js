import db from "../database.js"

// Failed login attempt tracking - only tracks FAILED attempts
export class LoginAttemptTracker {
  // Track failed login attempt (only called when login fails)
  // Uses a transaction to prevent race conditions
  static async trackFailedAttempt(identifier, ipAddress, userType = 'user') {
    await this.ensureAttemptsTable()
    
    // Get connection from pool for transaction
    const connection = await db.getConnection();
    
    try {
      await connection.beginTransaction();
      
      // Clean up old attempts (older than 5 minutes) - interstitial cleanup
      await connection.execute(
        'DELETE FROM login_attempts WHERE created_at < DATE_SUB(NOW(), INTERVAL 5 MINUTE)'
      );
      
      // Add new failed attempt atomically within transaction
      await connection.execute(
        'INSERT INTO login_attempts (identifier, ip_address, attempt_type, user_type) VALUES (?, ?, ?, ?)',
        [identifier, ipAddress, 'failed', userType]
      );
      
      await connection.commit();
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }
  
  // Get failed login attempts count (only counts FAILED attempts)
  static async getFailedAttempts(identifier, ipAddress, userType = 'user') {
    await this.ensureAttemptsTable()
    
    // Use database time for more accurate timing - only count FAILED attempts
    const [rows] = await db.execute(
      'SELECT COUNT(*) as count FROM login_attempts WHERE (identifier = ? OR ip_address = ?) AND attempt_type = ? AND user_type = ? AND created_at > DATE_SUB(NOW(), INTERVAL 5 MINUTE)',
      [identifier, ipAddress, 'failed', userType]
    )
    
    return rows[0]?.count || 0
  }

  // Get time remaining until lockout expires (in seconds)
  static async getLockoutTimeRemaining(identifier, ipAddress, userType = 'user') {
    await this.ensureAttemptsTable()
    
    // Use database TIMESTAMPDIFF for accurate time calculation (avoids JS Date/timezone issues)
    const [rows] = await db.execute(
      `SELECT 
        TIMESTAMPDIFF(SECOND, NOW(), DATE_ADD(MIN(created_at), INTERVAL 5 MINUTE)) as remaining_seconds
       FROM login_attempts 
       WHERE (identifier = ? OR ip_address = ?) AND attempt_type = ? AND user_type = ? 
       AND created_at > DATE_SUB(NOW(), INTERVAL 5 MINUTE)`,
      [identifier, ipAddress, 'failed', userType]
    )
    
    if (!rows[0] || rows[0].remaining_seconds === null) {
      return 0
    }
    
    return Math.max(0, rows[0].remaining_seconds)
  }
  
  // Clear all failed attempts (called on successful login to reset the counter)
  static async clearFailedAttempts(identifier, ipAddress, userType = 'user') {
    await db.execute(
      'DELETE FROM login_attempts WHERE (identifier = ? OR ip_address = ?) AND user_type = ?',
      [identifier, ipAddress, userType]
    )
  }
  
  static async ensureAttemptsTable() {
    try {
      await db.execute(`
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
      `)
      
      // Add user_type column if it doesn't exist (for existing tables)
      try {
        await db.execute(`ALTER TABLE login_attempts ADD COLUMN user_type ENUM('user', 'admin', 'superadmin') NOT NULL DEFAULT 'user'`)
        await db.execute(`ALTER TABLE login_attempts ADD INDEX idx_user_type (user_type)`)
        await db.execute(`ALTER TABLE login_attempts ADD INDEX idx_combined (identifier, ip_address, user_type, attempt_type)`)
      } catch (alterError) {
        // Column might already exist, ignore error
      }
    } catch (error) {
      // Table might already exist
    }
  }
}

export default LoginAttemptTracker
