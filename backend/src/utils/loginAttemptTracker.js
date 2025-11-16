import db from "../database.js"

// Configuration constants (OWASP/NIST recommend 5-10 attempts)
const MAX_FAILED_ATTEMPTS = 8;
const LOCKOUT_WINDOW_MINUTES = 5;
const LOCKOUT_DURATION_MINUTES = 5;

export class LoginAttemptTracker {
  static getMaxAttempts() { return MAX_FAILED_ATTEMPTS; }
  static getLockoutWindowMinutes() { return LOCKOUT_WINDOW_MINUTES; }
  static getLockoutDurationMinutes() { return LOCKOUT_DURATION_MINUTES; }

  // With unified users table: email is unique, so we track by email only (not by role)
  // This prevents brute force across all endpoints. userType is only for audit logging.
  static async trackFailedAttempt(identifier, ipAddress, userType = null) {
    await this.ensureAttemptsTable()
    
    const connection = await db.getConnection();
    
    try {
      await connection.beginTransaction();
      
      await connection.execute(
        `DELETE FROM login_attempts WHERE created_at < DATE_SUB(NOW(), INTERVAL ${LOCKOUT_WINDOW_MINUTES} MINUTE)`
      );
      
      await connection.execute(
        'INSERT INTO login_attempts (identifier, ip_address, attempt_type, user_type) VALUES (?, ?, ?, ?)',
        [identifier, ipAddress, 'failed', userType || 'user']
      );
      
      await connection.commit();
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }
  
  // Counts by email only (not by role) - prevents brute force across all endpoints
  static async getFailedAttempts(identifier, ipAddress = null, userType = null) {
    await this.ensureAttemptsTable()
    
    const [rows] = await db.execute(
      `SELECT COUNT(*) as count FROM login_attempts WHERE identifier = ? AND attempt_type = ? AND created_at > DATE_SUB(NOW(), INTERVAL ${LOCKOUT_WINDOW_MINUTES} MINUTE)`,
      [identifier, 'failed']
    )
    
    return rows[0]?.count || 0
  }

  static async getLockoutTimeRemaining(identifier, ipAddress = null, userType = null) {
    await this.ensureAttemptsTable()
    
    const [rows] = await db.execute(
      `SELECT 
        TIMESTAMPDIFF(SECOND, NOW(), DATE_ADD(MIN(created_at), INTERVAL ${LOCKOUT_DURATION_MINUTES} MINUTE)) as remaining_seconds
       FROM login_attempts 
       WHERE identifier = ? AND attempt_type = ? 
       AND created_at > DATE_SUB(NOW(), INTERVAL ${LOCKOUT_WINDOW_MINUTES} MINUTE)`,
      [identifier, 'failed']
    )
    
    if (!rows[0] || rows[0].remaining_seconds === null) {
      return 0
    }
    
    return Math.max(0, rows[0].remaining_seconds)
  }
  
  // Clears all attempts for this email (across all roles/endpoints)
  static async clearFailedAttempts(identifier, ipAddress = null, userType = null) {
    await db.execute(
      'DELETE FROM login_attempts WHERE identifier = ? AND attempt_type = ?',
      [identifier, 'failed']
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
      
      try {
        await db.execute(`ALTER TABLE login_attempts ADD COLUMN user_type ENUM('user', 'admin', 'superadmin') NOT NULL DEFAULT 'user'`)
        await db.execute(`ALTER TABLE login_attempts ADD INDEX idx_user_type (user_type)`)
        await db.execute(`ALTER TABLE login_attempts ADD INDEX idx_combined (identifier, ip_address, user_type, attempt_type)`)
      } catch (alterError) {
        // Column might already exist
      }
    } catch (error) {
      // Table might already exist
    }
  }
}

export default LoginAttemptTracker
