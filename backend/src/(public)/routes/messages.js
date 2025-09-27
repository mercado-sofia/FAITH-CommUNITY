import express from "express";
import { submitMessage } from "../controllers/messagesController.js";

const router = express.Router();

// Submit message from public portal
router.post("/messages", submitMessage);

export default router;
