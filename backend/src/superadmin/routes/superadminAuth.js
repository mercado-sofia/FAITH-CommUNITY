import express from "express"
import {
  loginSuperadmin,
  verifySuperadminToken,
  getSuperadminProfile,
  verifySuperadminPassword,
  updateSuperadminPassword,
  forgotPasswordSuperadmin,
  resetPasswordSuperadmin,
  checkEmailSuperadmin,
  validateResetToken,
  updateSuperadminEmail,
  requestSuperadminEmailChange,
  verifySuperadminEmailChangeOTP,
  setupTwoFA,
  verifyTwoFA,
  disableTwoFA,
  initializeSuperadmin,
} from "../controllers/superadminAuthController.js"

const router = express.Router()

// Public auth endpoints
router.post("/login", loginSuperadmin)
router.post("/forgot-password", forgotPasswordSuperadmin)
router.post("/reset-password", resetPasswordSuperadmin)
router.post("/validate-reset-token", validateResetToken)
router.post("/check-email", checkEmailSuperadmin)
router.post("/initialize", initializeSuperadmin)

// Protected endpoints
router.get("/profile/:id", verifySuperadminToken, getSuperadminProfile)
router.post("/verify-password/:id", verifySuperadminToken, verifySuperadminPassword)

// Email change routes
router.post("/email/request-change/:id", verifySuperadminToken, requestSuperadminEmailChange)
router.post("/email/verify-otp/:id", verifySuperadminToken, verifySuperadminEmailChangeOTP)
router.put("/email/:id", verifySuperadminToken, updateSuperadminEmail)

router.put("/password/:id", verifySuperadminToken, updateSuperadminPassword)

// 2FA routes
router.post("/2fa/setup/:id", verifySuperadminToken, setupTwoFA)
router.post("/2fa/verify/:id", verifySuperadminToken, verifyTwoFA)
router.post("/2fa/disable/:id", verifySuperadminToken, disableTwoFA)

export default router