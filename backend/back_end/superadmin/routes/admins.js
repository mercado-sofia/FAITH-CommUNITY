import express from "express"
import {
  createAdmin,
  getAllAdmins,
  getAdminById,
  updateAdmin,
  deleteAdmin,
  loginAdmin,
  verifyPasswordForEmailChange,
  verifyPasswordForPasswordChange,
  forgotPassword,
  resetPassword,
  checkEmailAdmin,
  validateResetToken,
  setupMfaAdmin,
  verifyMfaAdmin,
  disableMfaAdmin,
} from "../controllers/adminController.js"
import { verifySuperadminToken } from "../controllers/superadminAuthController.js"

const router = express.Router()

// Public routes
router.post("/login", loginAdmin)
router.post("/forgot-password", forgotPassword)
router.post("/reset-password", resetPassword)
router.post("/validate-reset-token", validateResetToken)
router.post("/check-email", checkEmailAdmin)

// Protected routes - using superadmin token verification
router.use(verifySuperadminToken)

router.get("/", getAllAdmins)
router.post("/", createAdmin)
router.get("/:id", getAdminById)
router.put("/:id", updateAdmin)
router.delete("/:id", deleteAdmin)
router.post("/:id/verify-password", verifyPasswordForEmailChange)
router.post("/:id/verify-password-change", verifyPasswordForPasswordChange)
router.post("/:id/mfa/setup", setupMfaAdmin)
router.post("/:id/mfa/verify", verifyMfaAdmin)
router.post("/:id/mfa/disable", disableMfaAdmin)

export default router
