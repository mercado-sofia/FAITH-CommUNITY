//controller: submissionController.js

import express from "express"
import {
  submitChanges,
  getSubmissionsByOrg,
  cancelSubmission,
  updateSubmission,
  getSubmissionById,
  bulkDeleteSubmissions,
} from "../controllers/submissionController.js"
import { verifyAdminOrSuperadmin } from "../../superadmin/middleware/verifyAdminOrSuperadmin.js"

const router = express.Router()

// Apply authentication middleware to all submission routes
router.use(verifyAdminOrSuperadmin)

// ✅ Create a new batch of submissions (used when admin clicks "Submit for Approval")
router.post("/", submitChanges)

// ✅ Get submission by ID (for detailed view)
router.get("/details/:id", getSubmissionById)

// ✅ Update a pending submission (admin re-edits before superadmin approval)
router.put("/:id", updateSubmission)

// ✅ Cancel (delete) a pending submission (admin clicks cancel)
router.delete("/:id", cancelSubmission)

// ✅ Bulk delete multiple submissions
router.post("/bulk-delete", bulkDeleteSubmissions)

// ✅ Fetch all submissions related to a specific org acronym (used for right panel display)
router.get("/:orgAcronym", getSubmissionsByOrg)

export default router