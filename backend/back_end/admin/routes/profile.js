//controller: adminProfileController.js

import express from "express"
import {
  getAdminProfile,
  updateAdminProfile,
  updateAdminEmail,
  requestAdminEmailChange,
  verifyAdminEmailChangeOTP,
  updateAdminPassword,
  verifyPasswordForEmailChange,
  verifyPasswordForPasswordChange
} from "../controllers/adminProfileController.js"
import { verifyAdminToken } from "../controllers/adminAuthController.js"

const router = express.Router()

// All routes require admin authentication
router.use(verifyAdminToken)

// Get admin's own profile
router.get("/", getAdminProfile)

// Update admin's organization profile and email
router.put("/", updateAdminProfile)

// Email change routes (secure flow)
router.post("/email/request-change", requestAdminEmailChange)
router.post("/email/verify-otp", verifyAdminEmailChangeOTP)
router.put("/email", updateAdminEmail) // Legacy endpoint

// Update admin's password
router.put("/password", updateAdminPassword)

// Verify password for email change
router.post("/verify-password-email", verifyPasswordForEmailChange)

// Verify password for password change
router.post("/verify-password-change", verifyPasswordForPasswordChange)

export default router
