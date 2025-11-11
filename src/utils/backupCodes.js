import crypto from "crypto"
import db from "../database.js"

export class BackupCodes {
  // Generate backup codes for MFA recovery
  static generateBackupCodes(count = 8) {
    const codes = []
    for (let i = 0; i < count; i++) {
      // Generate 8-character alphanumeric codes
      const code = crypto.randomBytes(4).toString('hex').toUpperCase()
      codes.push(code)
    }
    return codes
  }
  
  // Store backup codes for admin
  static async storeBackupCodes(adminId, codes) {
    await this.ensureBackupCodesTable()
    
    // Clear existing codes
    await db.execute('DELETE FROM mfa_backup_codes WHERE admin_id = ?', [adminId])
    
    // Store new codes (hashed)
    const bcrypt = await import('bcrypt')
    for (const code of codes) {
      const hashedCode = await bcrypt.hash(code, 10)
      await db.execute(
        'INSERT INTO mfa_backup_codes (admin_id, code_hash, created_at) VALUES (?, ?, NOW())',
        [adminId, hashedCode]
      )
    }
  }
  
  // Verify and consume backup code
  static async verifyBackupCode(adminId, code) {
    const [rows] = await db.execute(
      'SELECT id, code_hash FROM mfa_backup_codes WHERE admin_id = ? AND used_at IS NULL',
      [adminId]
    )
    
    if (rows.length === 0) {
      return { valid: false, reason: 'No backup codes available' }
    }
    
    const bcrypt = await import('bcrypt')
    
    for (const row of rows) {
      const isValid = await bcrypt.compare(code.toUpperCase(), row.code_hash)
      if (isValid) {
        // Mark code as used
        await db.execute(
          'UPDATE mfa_backup_codes SET used_at = NOW() WHERE id = ?',
          [row.id]
        )
        return { valid: true }
      }
    }
    
    return { valid: false, reason: 'Invalid backup code' }
  }
  
  // Get remaining backup codes count
  static async getRemainingCodesCount(adminId) {
    const [rows] = await db.execute(
      'SELECT COUNT(*) as count FROM mfa_backup_codes WHERE admin_id = ? AND used_at IS NULL',
      [adminId]
    )
    return rows[0]?.count || 0
  }
  
  // Regenerate backup codes
  static async regenerateBackupCodes(adminId) {
    const newCodes = this.generateBackupCodes()
    await this.storeBackupCodes(adminId, newCodes)
    return newCodes
  }
  
  // Ensure backup codes table exists
  static async ensureBackupCodesTable() {
    try {
      await db.execute(`
        CREATE TABLE IF NOT EXISTS mfa_backup_codes (
          id INT AUTO_INCREMENT PRIMARY KEY,
          admin_id INT NOT NULL,
          code_hash VARCHAR(255) NOT NULL,
          created_at TIMESTAMP NOT NULL,
          used_at TIMESTAMP NULL,
          INDEX idx_admin (admin_id),
          FOREIGN KEY (admin_id) REFERENCES admins(id) ON DELETE CASCADE
        )
      `)
    } catch (error) {
      // Table might already exist
    }
  }
}

export default BackupCodes
