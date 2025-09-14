import express from "express"
import {
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
router.get("/:id", getAdminById)
router.put("/:id", updateAdmin)
router.delete("/:id", deleteAdmin)
router.post("/:id/verify-password", verifyPasswordForEmailChange)
router.post("/:id/verify-password-change", verifyPasswordForPasswordChange)

export default router
