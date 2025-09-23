//controller: headController.js

import express from "express"
import { getHeads, addHead, updateHead, deleteHead, bulkUpdateHeads, bulkDeleteHeads, reorderHeads } from "../controllers/headController.js"
import { cloudinaryUploadConfigs } from "../../utils/cloudinaryUpload.js"

const router = express.Router()

// GET heads by organization_id
router.get("/:organization_id", getHeads)

// POST new head
router.post("/", cloudinaryUploadConfigs.organizationHead.single('photo'), addHead)

// PUT bulk update heads for an organization
router.put("/bulk", bulkUpdateHeads)

// PUT reorder heads for an organization
router.put("/reorder", reorderHeads)

// DELETE bulk delete heads for an organization
router.delete("/bulk", bulkDeleteHeads)

// PUT update head by ID
router.put("/:id", cloudinaryUploadConfigs.organizationHead.single('photo'), updateHead)

// DELETE head by ID
router.delete("/:id", deleteHead)

export default router