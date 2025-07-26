import express from "express"
import { getHeads, addHead, updateHead, deleteHead, bulkUpdateHeads } from "../controllers/headController.js"

const router = express.Router()

// GET heads by organization_id
router.get("/:organization_id", getHeads)

// POST new head
router.post("/", addHead)

// PUT bulk update heads for an organization
router.put("/bulk", bulkUpdateHeads)

// PUT update head by ID
router.put("/:id", updateHead)

// DELETE head by ID
router.delete("/:id", deleteHead)

export default router