import db from "../database.js"

// Failed login attempt tracking
export class LoginAttemptTracker {
  static async trackFailedAttempt(identifier, ipAddress) {
    await this.ensureAttemptsTable()
    
    // Use database time for more accurate timing
    await db.execute(
      'DELETE FROM login_attempts WHERE created_at < DATE_SUB(NOW(), INTERVAL 5 MINUTE)'
    )
    
    // Add new attempt
    await db.execute(
      'INSERT INTO login_attempts (identifier, ip_address, attempt_type) VALUES (?, ?, ?)',
      [identifier, ipAddress, 'failed']
    )
  }
  
  static async getFailedAttempts(identifier, ipAddress) {
    await this.ensureAttemptsTable()
    
    // Use database time for more accurate timing
    const [rows] = await db.execute(
      'SELECT COUNT(*) as count FROM login_attempts WHERE (identifier = ? OR ip_address = ?) AND attempt_type = ? AND created_at > DATE_SUB(NOW(), INTERVAL 5 MINUTE)',
      [identifier, ipAddress, 'failed']
    )
    
    return rows[0]?.count || 0
  }
  
  static async clearFailedAttempts(identifier, ipAddress) {
    await db.execute(
      'DELETE FROM login_attempts WHERE (identifier = ? OR ip_address = ?) AND attempt_type = ?',
      [identifier, ipAddress, 'failed']
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
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          INDEX idx_identifier (identifier),
          INDEX idx_ip (ip_address),
          INDEX idx_created (created_at)
        )
      `)
    } catch (error) {
      // Table might already exist
    }
  }
}

export default LoginAttemptTracker
