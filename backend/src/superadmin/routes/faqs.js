import express from "express"
import { getAllFaqs, getActiveFaqs, getFaqById, createFaq, updateFaq, deleteFaq } from "../controllers/faqController.js"
import { verifySuperadminToken } from '../controllers/superadminAuthController.js';

const router = express.Router()

// Public routes
router.get("/active", getActiveFaqs)

// SECURITY FIX: Admin routes require superadmin authentication
router.use(verifySuperadminToken);

router.get("/", getAllFaqs)
router.get("/:id", getFaqById)
router.post("/", createFaq)
router.put("/:id", updateFaq)
router.delete("/:id", deleteFaq)

export default router
