//controller: organizationController.js

import express from "express"
const router = express.Router()
import { createOrganization, updateOrganizationInfo, getOrganizationByName, getOrganizationById, checkAcronymExists, checkNameExists } from "../controllers/organizationController.js"
import { cloudinaryUploadConfigs } from "../../utils/cloudinaryUpload.js"

// GET organization by org name/acronym
router.get("/org/:org_name", getOrganizationByName)

// GET organization by ID
router.get("/:id", getOrganizationById)

// POST create new organization
router.post("/", createOrganization)

// PUT update organization by ID
router.put("/:id", cloudinaryUploadConfigs.organizationLogo.single('logo'), updateOrganizationInfo)

// GET check if organization acronym exists
router.get("/check-acronym/:acronym", checkAcronymExists)

// GET check if organization name exists
router.get("/check-name/:name", checkNameExists)

export default router