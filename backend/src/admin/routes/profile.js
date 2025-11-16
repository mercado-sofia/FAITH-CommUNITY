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

router.use(verifyAdminToken)

router.get("/", getAdminProfile)
router.put("/", updateAdminProfile)

// Email change routes
router.post("/email/request-change", requestAdminEmailChange)
router.post("/email/verify-otp", verifyAdminEmailChangeOTP)

router.put("/password", updateAdminPassword)
router.post("/verify-password-email", verifyPasswordForEmailChange)

export default router