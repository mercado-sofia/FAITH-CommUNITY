import crypto from "crypto"
import db from "../database.js"

export class SessionSecurity {
  // Create session fingerprint from IP and User-Agent
  static createFingerprint(ipAddress, userAgent) {
    const data = `${ipAddress}:${userAgent || 'unknown'}`
    return crypto.createHash('sha256').update(data).digest('hex')
  }
  
  // Store admin session with security binding
  static async createAdminSession(adminId, ipAddress, userAgent, token) {
    await this.ensureSessionTable()
    
    const fingerprint = this.createFingerprint(ipAddress, userAgent)
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000) // 30 minutes
    
    await db.execute(
      `INSERT INTO admin_sessions (admin_id, token_hash, fingerprint, ip_address, user_agent, expires_at) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      [adminId, this.hashToken(token), fingerprint, ipAddress, userAgent, expiresAt]
    )
  }
  
  // Verify admin session security
  static async verifyAdminSession(token, ipAddress, userAgent) {
    const tokenHash = this.hashToken(token)
    const currentFingerprint = this.createFingerprint(ipAddress, userAgent)
    
    const [rows] = await db.execute(
      `SELECT admin_id, fingerprint FROM admin_sessions 
       WHERE token_hash = ? AND expires_at > NOW()`,
      [tokenHash]
    )
    
    if (rows.length === 0) {
      return { valid: false, reason: 'Session not found or expired' }
    }
    
    const session = rows[0]
    
    // Check fingerprint match
    if (session.fingerprint !== currentFingerprint) {
      // Revoke suspicious session
      await this.revokeAdminSession(tokenHash)
      return { valid: false, reason: 'Session security violation - IP/UA mismatch' }
    }
    
    return { valid: true, adminId: session.admin_id }
  }
  
  // Revoke admin session
  static async revokeAdminSession(tokenHash) {
    await db.execute(
      'DELETE FROM admin_sessions WHERE token_hash = ?',
      [tokenHash]
    )
  }
  
  // Revoke all sessions for admin
  static async revokeAllAdminSessions(adminId) {
    await db.execute(
      'DELETE FROM admin_sessions WHERE admin_id = ?',
      [adminId]
    )
  }
  
  // Clean expired sessions
  static async cleanExpiredSessions() {
    await db.execute('DELETE FROM admin_sessions WHERE expires_at < NOW()')
  }
  
  // Hash token for storage
  static hashToken(token) {
    return crypto.createHash('sha256').update(token).digest('hex')
  }
  
  // Ensure session table exists
  static async ensureSessionTable() {
    try {
      await db.execute(`
        CREATE TABLE IF NOT EXISTS admin_sessions (
          id INT AUTO_INCREMENT PRIMARY KEY,
          admin_id INT NOT NULL,
          token_hash VARCHAR(64) UNIQUE NOT NULL,
          fingerprint VARCHAR(64) NOT NULL,
          ip_address VARCHAR(45) NOT NULL,
          user_agent VARCHAR(500) NULL,
          expires_at TIMESTAMP NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          INDEX idx_token (token_hash),
          INDEX idx_admin (admin_id),
          INDEX idx_expires (expires_at),
          FOREIGN KEY (admin_id) REFERENCES admins(id) ON DELETE CASCADE
        )
      `)
    } catch (error) {
      // Table might already exist
    }
  }
}

export default SessionSecurity
