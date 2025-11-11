// controller: advocacyController.js

import express from "express"
import { addAdvocacy, getAdvocacies, deleteAdvocacy, getAllAdvocacies } from "../controllers/advocacyController.js"

const router = express.Router()

// GET all advocacies (admin use)
router.get("/", getAllAdvocacies)

// GET advocacy by organization ID
router.get("/:organization_id", getAdvocacies)

// POST create/update advocacy by organization
router.post("/", addAdvocacy)

// DELETE advocacy by ID
router.delete("/:id", deleteAdvocacy)

export default router