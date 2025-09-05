import crypto from "crypto"
import db from "../database.js"

// Simple math CAPTCHA implementation (can be replaced with reCAPTCHA)
export class CaptchaService {
  static async generateMathCaptcha() {
    const num1 = Math.floor(Math.random() * 10) + 1
    const num2 = Math.floor(Math.random() * 10) + 1
    const operation = Math.random() > 0.5 ? '+' : '-'
    
    let question, answer
    if (operation === '+') {
      question = `${num1} + ${num2}`
      answer = num1 + num2
    } else {
      question = `${num1} - ${num2}`
      answer = num1 - num2
    }
    
    const token = crypto.randomBytes(16).toString('hex')
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000) // 5 minutes
    
    // Store in database
    await this.ensureCaptchaTable()
    await db.execute(
      'INSERT INTO captcha_challenges (token, answer, expires_at) VALUES (?, ?, ?)',
      [token, answer, expiresAt]
    )
    
    return { token, question }
  }
  
  static async verifyCaptcha(token, userAnswer) {
    if (!token || userAnswer === undefined) return false
    
    try {
      const [rows] = await db.execute(
        'SELECT answer FROM captcha_challenges WHERE token = ? AND expires_at > NOW()',
        [token]
      )
      
      if (rows.length === 0) return false
      
      const isValid = parseInt(userAnswer) === rows[0].answer
      
      // Clean up used token
      await db.execute('DELETE FROM captcha_challenges WHERE token = ?', [token])
      
      return isValid
    } catch (error) {
      console.error('CAPTCHA verification error:', error)
      return false
    }
  }
  
  static async ensureCaptchaTable() {
    try {
      await db.execute(`
        CREATE TABLE IF NOT EXISTS captcha_challenges (
          id INT AUTO_INCREMENT PRIMARY KEY,
          token VARCHAR(32) UNIQUE NOT NULL,
          answer INT NOT NULL,
          expires_at TIMESTAMP NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          INDEX idx_token (token),
          INDEX idx_expires (expires_at)
        )
      `)
    } catch (error) {
      // Table might already exist
    }
  }
  
  static async cleanupExpiredCaptchas() {
    try {
      await db.execute('DELETE FROM captcha_challenges WHERE expires_at < NOW()')
    } catch (error) {
      console.error('CAPTCHA cleanup error:', error)
    }
  }
}

// Failed login attempt tracking
export class LoginAttemptTracker {
  static async trackFailedAttempt(identifier, ipAddress) {
    await this.ensureAttemptsTable()
    
    const windowStart = new Date(Date.now() - 15 * 60 * 1000) // 15 minutes
    
    // Clean old attempts
    await db.execute(
      'DELETE FROM login_attempts WHERE created_at < ?',
      [windowStart]
    )
    
    // Add new attempt
    await db.execute(
      'INSERT INTO login_attempts (identifier, ip_address, attempt_type) VALUES (?, ?, ?)',
      [identifier, ipAddress, 'failed']
    )
  }
  
  static async getFailedAttempts(identifier, ipAddress) {
    await this.ensureAttemptsTable()
    
    const windowStart = new Date(Date.now() - 15 * 60 * 1000) // 15 minutes
    
    const [rows] = await db.execute(
      'SELECT COUNT(*) as count FROM login_attempts WHERE (identifier = ? OR ip_address = ?) AND attempt_type = ? AND created_at > ?',
      [identifier, ipAddress, 'failed', windowStart]
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

export default { CaptchaService, LoginAttemptTracker }
