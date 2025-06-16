import express from 'express';
import {
  createSubmission,
  getSubmissionsByAdmin,
  getSubmissionById,
  updateSubmissionStatus,
  cancelSubmission,
  updateSubmission,
  upload
} from '../controllers/submissionController.js';

const router = express.Router();

router.post('/', createSubmission); // Submit update
router.get('/', getSubmissionsByAdmin); // List all by admin
router.get('/:id', getSubmissionById); // View details
router.put('/:id', upload.any(), updateSubmission); // Update submission data with file upload support
router.put('/:id/status', updateSubmissionStatus); // Approve/Reject
router.delete('/:id', cancelSubmission); // Cancel

export default router;
