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
  testPasswordUpdate,
  testDatabaseConnection,
} from "../controllers/adminController.js"

const router = express.Router()

// Public routes
router.post("/login", loginAdmin)

// Protected routes (require JWT token)
router.post("/", createAdmin)
router.get("/", getAllAdmins)
router.get("/:id", getAdminById)
router.put("/:id", updateAdmin)
router.delete("/:id", deleteAdmin)
router.post("/:id/verify-password", verifyPasswordForEmailChange)
router.post("/:id/verify-password-change", verifyPasswordForPasswordChange)
router.post("/:id/test-password-update", testPasswordUpdate)

// Test routes (for debugging)
router.get("/test/database", testDatabaseConnection)

export default router
