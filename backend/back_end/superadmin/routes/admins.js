import express from "express"
import {
  createAdmin,
  getAllAdmins,
  getAdminById,
  updateAdmin,
  deleteAdmin,
  loginAdmin,
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

export default router
