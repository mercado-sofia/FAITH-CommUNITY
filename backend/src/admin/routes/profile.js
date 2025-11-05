//controller: adminProfileController.js

import express from "express"
import {
  getAdminProfile,
  updateAdminProfile,
  requestAdminEmailChange,
  verifyAdminEmailChangeOTP,
  updateAdminPassword,
  verifyPasswordForEmailChange
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

// Update admin's password
router.put("/password", updateAdminPassword)

// Verify password for email change
router.post("/verify-password-email", verifyPasswordForEmailChange)

export default router