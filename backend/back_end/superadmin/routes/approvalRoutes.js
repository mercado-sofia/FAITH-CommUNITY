import express from 'express';
import { 
  approveSubmission, 
  getPendingSubmissions, 
  rejectSubmission,
  bulkApproveSubmissions,
  bulkRejectSubmissions,
  bulkDeleteSubmissions
} from '../controllers/approvalController.js';

const router = express.Router();

// GET pending submissions
router.get('/pending', getPendingSubmissions);

// PUT approve submission
router.put('/:id/approve', approveSubmission);

// PUT reject submission
router.put('/:id/reject', rejectSubmission);

// POST bulk approve submissions
router.post('/bulk/approve', bulkApproveSubmissions);

// POST bulk reject submissions
router.post('/bulk/reject', bulkRejectSubmissions);

// POST bulk delete submissions
router.post('/bulk/delete', bulkDeleteSubmissions);

export default router;