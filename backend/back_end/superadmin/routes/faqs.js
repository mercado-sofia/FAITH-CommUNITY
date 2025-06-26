import express from "express";
import { getAllFaqs, createFaq, deleteFaq } from "../controllers/faqController.js";

const router = express.Router();

router.get("/", getAllFaqs);
router.post("/", createFaq);
router.delete("/:id", deleteFaq);

export default router;