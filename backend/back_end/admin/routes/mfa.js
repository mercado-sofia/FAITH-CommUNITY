//controller: mfaController.js
import express from "express"
import { verifyAdminToken } from "../controllers/adminAuthController.js"
import { 
  setupMfaAdmin, 
  verifyMfaAdmin, 
  disableMfaAdmin,
  getMfaStatusAdmin,
  getBackupCodesStatus,
  regenerateBackupCodes
} from "../controllers/mfaController.js"

const router = express.Router()

// Get MFA status for admin
router.get('/:id/mfa-status', verifyAdminToken, getMfaStatusAdmin)

// Setup MFA for admin
router.post('/:id/mfa-setup', verifyAdminToken, setupMfaAdmin)

// Verify and enable MFA for admin
router.post('/:id/mfa-verify', verifyAdminToken, verifyMfaAdmin)

// Disable MFA for admin
router.post('/:id/mfa-disable', verifyAdminToken, disableMfaAdmin)

// Get backup codes status
router.get('/:id/backup-codes-status', verifyAdminToken, getBackupCodesStatus)

// Regenerate backup codes
router.post('/:id/regenerate-backup-codes', verifyAdminToken, regenerateBackupCodes)

export default router
