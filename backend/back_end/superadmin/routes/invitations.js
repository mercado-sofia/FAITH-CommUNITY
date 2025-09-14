import express from "express"
import {
  sendInvitation,
  validateInvitationToken,
  acceptInvitation,
  getAllInvitations,
  cancelInvitation
} from "../controllers/invitationController.js"
import { verifyAdminOrSuperadmin } from "../middleware/verifyAdminOrSuperadmin.js"

const router = express.Router()

// Public routes (no authentication required)
router.get("/validate/:token", validateInvitationToken)
router.post("/accept", acceptInvitation)

// Protected routes (require admin or superadmin authentication)
router.post("/send", verifyAdminOrSuperadmin, sendInvitation)
router.get("/", verifyAdminOrSuperadmin, getAllInvitations)
router.put("/cancel/:id", verifyAdminOrSuperadmin, cancelInvitation)

export default router
