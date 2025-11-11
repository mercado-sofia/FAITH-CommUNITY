import express from "express"
import { 
  getFooterContent, 
  updateContactInfo, 
  updateSocialMedia, 
  updateCopyright,
  getServices,
  addService,
  updateService,
  deleteService
} from "../controllers/footerController.js"
import { verifySuperadminToken } from "../controllers/superadminAuthController.js"

const router = express.Router()

// Public route - get footer content
router.get("/", getFooterContent)

// Protected routes - require superadmin authentication
router.use(verifySuperadminToken)

// Contact information routes
router.put("/contact", updateContactInfo)

// Social media routes
router.put("/social-media", updateSocialMedia)

// Copyright routes
router.put("/copyright", updateCopyright)

// Services routes
router.get("/services", getServices)
router.post("/services", addService)
router.put("/services/:id", updateService)
router.delete("/services/:id", deleteService)

export default router
