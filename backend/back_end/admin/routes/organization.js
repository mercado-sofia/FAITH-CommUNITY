//controller: organizationController.js

import express from "express"
const router = express.Router()
import { createOrganization, updateOrganizationInfo, getOrganizationByName } from "../controllers/organizationController.js"

// GET organization by org name/acronym
router.get("/org/:org_name", getOrganizationByName)

// POST create new organization
router.post("/", createOrganization)

// PUT update organization by ID
router.put("/:id", updateOrganizationInfo)

export default router