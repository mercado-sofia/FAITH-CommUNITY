import express from "express"
import {
  loginSuperadmin,
  verifySuperadminToken,
  getSuperadminProfile,
  updateSuperadminPassword,
  // frontend/sofia branch
  forgotPasswordSuperadmin,
  resetPasswordSuperadmin,
  checkEmailSuperadmin,
  validateResetToken,
  // main branch
  updateSuperadminEmail,
  setupMfaSuperadmin,
  verifyMfaSuperadmin,
  disableMfaSuperadmin,
} from "../controllers/superadminAuthController.js"

const router = express.Router()

// ---------- Public auth endpoints ----------
router.post("/login",        loginSuperadmin)
router.post("/forgot-password",  forgotPasswordSuperadmin)
router.post("/reset-password",   resetPasswordSuperadmin)
router.post("/validate-reset-token", validateResetToken)
router.post("/check-email",   checkEmailSuperadmin)

// ---------- Protected endpoints ----------
router.get("/profile/:id",   verifySuperadminToken, getSuperadminProfile)
router.put("/email/:id",     verifySuperadminToken, updateSuperadminEmail)
router.put("/password/:id",  verifySuperadminToken, updateSuperadminPassword)
router.post("/mfa/setup/:id", verifySuperadminToken, setupMfaSuperadmin)
router.post("/mfa/verify/:id", verifySuperadminToken, verifyMfaSuperadmin)
router.post("/mfa/disable/:id", verifySuperadminToken, disableMfaSuperadmin)

export default router