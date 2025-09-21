import express from "express"
import { getFooterContent, updateFooterContent } from "../controllers/footerController.js"
import { verifySuperadminToken } from "../controllers/superadminAuthController.js"

const router = express.Router()

// Public route - get footer content
router.get("/", getFooterContent)

// Protected routes - require superadmin authentication
router.use(verifySuperadminToken)

// Update footer content (for future use)
router.put("/", updateFooterContent)

export default router
