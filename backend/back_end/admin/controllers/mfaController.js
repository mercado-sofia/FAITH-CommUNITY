//db table: admins
import db from "../../database.js"
import { authenticator } from "otplib"
import { BackupCodes } from "../../utils/backupCodes.js"

// Get MFA status for admin
export const getMfaStatusAdmin = async (req, res) => {
  try {
    const { id } = req.params
    
    // Ensure MFA columns exist
    await ensureMfaColumns()
    
    const [rows] = await db.execute(
      'SELECT id, mfa_enabled FROM admins WHERE id = ?',
      [id]
    )
    
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Admin not found' })
    }
    
    res.json({
      mfaEnabled: Boolean(rows[0].mfa_enabled)
    })
  } catch (error) {
    console.error('Get MFA status error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
}

// Setup MFA for admin
export const setupMfaAdmin = async (req, res) => {
  try {
    const { id } = req.params
    
    // Ensure MFA columns exist
    await ensureMfaColumns()
    
    const [rows] = await db.execute('SELECT id, email FROM admins WHERE id = ?', [id])
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Admin not found' })
    }

    const secret = authenticator.generateSecret()
    const label = encodeURIComponent(`FAITH-CommUNITY:admin-${rows[0].email}`)
    const issuer = encodeURIComponent(process.env.TOTP_ISSUER || 'FAITH-CommUNITY')
    const otpauth = `otpauth://totp/${label}?secret=${secret}&issuer=${issuer}`

    // Temporarily store secret until verified
    await db.execute('UPDATE admins SET mfa_secret = ? WHERE id = ?', [secret, id])
    
    res.json({ otpauth, secret })
  } catch (error) {
    console.error('MFA setup error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
}

// Verify and enable MFA for admin
export const verifyMfaAdmin = async (req, res) => {
  try {
    const { id } = req.params
    const { otp } = req.body
    
    if (!otp) {
      return res.status(400).json({ error: 'OTP is required' })
    }
    
    const [rows] = await db.execute('SELECT id, mfa_secret FROM admins WHERE id = ?', [id])
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Admin not found' })
    }
    
    const secret = rows[0].mfa_secret || ''
    if (!secret) {
      return res.status(400).json({ error: 'MFA not in setup. Please setup MFA first.' })
    }
    
    const isValid = authenticator.check(String(otp), secret)
    if (!isValid) {
      return res.status(400).json({ error: 'Invalid OTP. Please try again.' })
    }
    
    // Enable MFA and generate backup codes
    await db.execute('UPDATE admins SET mfa_enabled = 1 WHERE id = ?', [id])
    
    // Generate backup codes
    const backupCodes = BackupCodes.generateBackupCodes()
    await BackupCodes.storeBackupCodes(id, backupCodes)
    
    res.json({ 
      message: 'MFA enabled successfully',
      backupCodes: backupCodes
    })
  } catch (error) {
    console.error('MFA verify error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
}

// Disable MFA for admin
export const disableMfaAdmin = async (req, res) => {
  try {
    const { id } = req.params
    
    await db.execute('UPDATE admins SET mfa_enabled = 0, mfa_secret = NULL WHERE id = ?', [id])
    
    // Clear backup codes
    await db.execute('DELETE FROM mfa_backup_codes WHERE admin_id = ?', [id])
    
    res.json({ message: 'MFA disabled successfully' })
  } catch (error) {
    console.error('MFA disable error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
}

// Get backup codes status
export const getBackupCodesStatus = async (req, res) => {
  try {
    const { id } = req.params
    const remainingCodes = await BackupCodes.getRemainingCodesCount(id)
    
    res.json({ remainingCodes })
  } catch (error) {
    console.error('Get backup codes status error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
}

// Regenerate backup codes
export const regenerateBackupCodes = async (req, res) => {
  try {
    const { id } = req.params
    const newCodes = await BackupCodes.regenerateBackupCodes(id)
    
    res.json({ 
      message: 'Backup codes regenerated successfully',
      backupCodes: newCodes
    })
  } catch (error) {
    console.error('Regenerate backup codes error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
}

// Ensure MFA columns exist in admins table
async function ensureMfaColumns() {
  try {
    await db.execute(`ALTER TABLE admins ADD COLUMN mfa_enabled TINYINT(1) DEFAULT 0`)
  } catch (error) {
    // Column might already exist
  }
  
  try {
    await db.execute(`ALTER TABLE admins ADD COLUMN mfa_secret VARCHAR(255) NULL`)
  } catch (error) {
    // Column might already exist
  }
}

export default {
  getMfaStatusAdmin,
  setupMfaAdmin,
  verifyMfaAdmin,
  disableMfaAdmin,
  getBackupCodesStatus,
  regenerateBackupCodes
}
