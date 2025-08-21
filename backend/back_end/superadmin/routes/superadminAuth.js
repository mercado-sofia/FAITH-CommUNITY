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

export default router