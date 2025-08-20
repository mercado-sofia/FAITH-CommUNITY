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
} from "../controllers/adminController.js"

const router = express.Router()

// Public routes
router.post("/login", loginAdmin)
router.post("/forgot-password", forgotPassword)
router.post("/reset-password", resetPassword)

// Protected routes (require JWT token)
router.post("/", createAdmin)
router.get("/", getAllAdmins)
router.get("/:id", getAdminById)
router.put("/:id", updateAdmin)
router.delete("/:id", deleteAdmin)
router.post("/:id/verify-password", verifyPasswordForEmailChange)
router.post("/:id/verify-password-change", verifyPasswordForPasswordChange)

export default router
