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
  verifyAdminToken,
  validateResetToken,
} from "../controllers/adminController.js"

const router = express.Router()

// Public routes
router.post("/login", loginAdmin)
router.post("/forgot-password", forgotPassword)
router.post("/reset-password", resetPassword)
router.post("/validate-reset-token", validateResetToken)
router.post("/check-email", checkEmailAdmin)

// Protected routes
router.use(verifyAdminToken)

router.get("/", getAllAdmins)
router.post("/", createAdmin)
router.get("/:id", getAdminById)
router.put("/:id", updateAdmin)
router.delete("/:id", deleteAdmin)
router.post("/:id/verify-password", verifyPasswordForEmailChange)
router.post("/:id/verify-password-change", verifyPasswordForPasswordChange)

export default router
