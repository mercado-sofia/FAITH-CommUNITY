import crypto from "crypto"
import db from "../database.js"
import { getClientIpAddress } from "./ipAddressHelper.js"

export class StepUpAuth {
  // Create step-up authentication challenge
  static async createStepUpChallenge(adminId, action, ipAddress) {
    await this.ensureStepUpTable()
    
    const token = crypto.randomBytes(32).toString('hex')
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000) // 10 minutes
    
    await db.execute(
      `INSERT INTO step_up_challenges (admin_id, token, action, ip_address, expires_at) 
       VALUES (?, ?, ?, ?, ?)`,
      [adminId, token, action, ipAddress, expiresAt]
    )
    
    return token
  }
  
  // Verify step-up authentication
  static async verifyStepUpChallenge(token, password, adminId) {
    const [rows] = await db.execute(
      `SELECT c.admin_id, c.action, a.password 
       FROM step_up_challenges c
       JOIN admins a ON c.admin_id = a.id
       WHERE c.token = ? AND c.expires_at > NOW() AND c.admin_id = ?`,
      [token, adminId]
    )
    
    if (rows.length === 0) {
      return { valid: false, reason: 'Challenge not found or expired' }
    }
    
    const challenge = rows[0]
    
    // Verify password
    const bcrypt = await import('bcrypt')
    const isValid = await bcrypt.compare(password, challenge.password)
    
    if (!isValid) {
      return { valid: false, reason: 'Invalid password' }
    }
    
    // Clean up used challenge
    await db.execute('DELETE FROM step_up_challenges WHERE token = ?', [token])
    
    return { valid: true, action: challenge.action }
  }
  
  // Check if action requires step-up auth
  static requiresStepUp(action) {
    const sensitiveActions = [
      'approve_submission',
      'reject_submission',
      'change_password',
      'change_email',
      'delete_admin',
      'create_admin',
      'disable_mfa',
      'bulk_delete'
    ]
    
    return sensitiveActions.includes(action)
  }
  
  // Clean expired challenges
  static async cleanExpiredChallenges() {
    await db.execute('DELETE FROM step_up_challenges WHERE expires_at < NOW()')
  }
  
  // Ensure step-up table exists
  static async ensureStepUpTable() {
    try {
      await db.execute(`
        CREATE TABLE IF NOT EXISTS step_up_challenges (
          id INT AUTO_INCREMENT PRIMARY KEY,
          admin_id INT NOT NULL,
          token VARCHAR(64) UNIQUE NOT NULL,
          action VARCHAR(100) NOT NULL,
          ip_address VARCHAR(45) NOT NULL,
          expires_at TIMESTAMP NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          INDEX idx_token (token),
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

// Middleware for step-up authentication
export const requireStepUp = (action) => {
  return async (req, res, next) => {
    if (!StepUpAuth.requiresStepUp(action)) {
      return next()
    }
    
    const { stepUpToken, stepUpPassword } = req.body
    
    if (!stepUpToken || !stepUpPassword) {
      const token = await StepUpAuth.createStepUpChallenge(
        req.admin.id,
        action,
        getClientIpAddress(req)
      )
      
      return res.status(403).json({
        error: 'Step-up authentication required',
        requiresStepUp: true,
        stepUpToken: token,
        action: action
      })
    }
    
    const verification = await StepUpAuth.verifyStepUpChallenge(
      stepUpToken,
      stepUpPassword,
      req.admin.id
    )
    
    if (!verification.valid) {
      return res.status(403).json({
        error: 'Step-up authentication failed',
        reason: verification.reason
      })
    }
    
    next()
  }
}

export default { StepUpAuth, requireStepUp }
