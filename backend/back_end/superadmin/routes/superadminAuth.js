import express from "express"
import {
  loginSuperadmin,
  verifySuperadminToken,
  getSuperadminProfile,
  updateSuperadminPassword,
  forgotPasswordSuperadmin,
  resetPasswordSuperadmin,
  checkEmailSuperadmin,
  validateResetToken,
} from "../controllers/superadminAuthController.js"


const router = express.Router()


// POST /api/superadmin/auth/login - Superadmin login
router.post("/login", loginSuperadmin)

// POST /api/superadmin/auth/forgot-password - Forgot password
router.post("/forgot-password", forgotPasswordSuperadmin)

// POST /api/superadmin/auth/reset-password - Reset password
router.post("/reset-password", resetPasswordSuperadmin)

// POST /api/superadmin/auth/validate-reset-token - Validate reset token
router.post("/validate-reset-token", validateResetToken)

// POST /api/superadmin/auth/check-email - Check if email exists
router.post("/check-email", checkEmailSuperadmin)


// GET /api/superadmin/auth/profile/:id - Get superadmin profile (protected)
router.get("/profile/:id", verifySuperadminToken, getSuperadminProfile)


// PUT /api/superadmin/auth/password/:id - Update superadmin password (protected)
router.put("/password/:id", verifySuperadminToken, updateSuperadminPassword)


export default router
