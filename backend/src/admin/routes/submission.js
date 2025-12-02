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

// Apply route-specific body parser with higher limit for large payloads (post-act reports, images)
// This must be applied BEFORE authentication middleware to handle body parsing errors properly
router.use(express.json({ limit: "50mb" }))

// Body parser error handler for this router
router.use((err, req, res, next) => {
  // Check for JSON parsing errors - body-parser may create errors with type 'entity.parse.failed'
  // that are not instances of SyntaxError, so we check both conditions
  // Note: body-parser errors use statusCode, not status, so we check both
  if ((err instanceof SyntaxError || err.type === 'entity.parse.failed') && (err.statusCode === 400 || err.status === 400)) {
    // JSON parsing error from body parser
    return res.status(400).json({
      success: false,
      message: 'Invalid JSON in request body',
      error: 'Malformed JSON',
      errorType: 'JSON_PARSE_ERROR'
    });
  }
  if (err.type === 'entity.too.large') {
    // Payload too large error
    return res.status(413).json({
      success: false,
      message: 'Request payload too large. Maximum size is 50MB.',
      error: 'Payload exceeds the maximum allowed size',
      errorType: 'PAYLOAD_TOO_LARGE',
      maxSizeMB: 50
    });
  }
  next(err);
});

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