//controller: organizationController.js

import express from "express"
const router = express.Router()
import { createOrganization, updateOrganizationInfo, getOrganizationByName, getOrganizationById } from "../controllers/organizationController.js"

// GET organization by org name/acronym
router.get("/org/:org_name", getOrganizationByName)

// GET organization by ID
router.get("/:id", getOrganizationById)

// POST create new organization
router.post("/", createOrganization)

// PUT update organization by ID
router.put("/:id", updateOrganizationInfo)

export default router