import express from "express"
import { getAllFaqs, getActiveFaqs, getFaqById, createFaq, updateFaq, deleteFaq } from "../controllers/faqController.js"

const router = express.Router()

// Public routes
router.get("/active", getActiveFaqs)

// Admin routes (you can add JWT middleware here if needed)
router.get("/", getAllFaqs)
router.get("/:id", getFaqById)
router.post("/", createFaq)
router.put("/:id", updateFaq)
router.delete("/:id", deleteFaq)

export default router
