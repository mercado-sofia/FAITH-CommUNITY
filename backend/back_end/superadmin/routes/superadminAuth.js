import express from "express"
import {
  loginSuperadmin,
  verifySuperadminToken,
  getSuperadminProfile,
  updateSuperadminPassword,
} from "../controllers/superadminAuthController.js"


const router = express.Router()


// POST /api/superadmin/auth/login - Superadmin login
router.post("/login", loginSuperadmin)


// GET /api/superadmin/auth/profile/:id - Get superadmin profile (protected)
router.get("/profile/:id", verifySuperadminToken, getSuperadminProfile)


// PUT /api/superadmin/auth/password/:id - Update superadmin password (protected)
router.put("/password/:id", verifySuperadminToken, updateSuperadminPassword)


export default router
