import express from 'express';
import { 
  approveSubmission, 
  getPendingSubmissions, 
  getAllSubmissions,
  rejectSubmission,
  deleteSubmission,
  bulkApproveSubmissions,
  bulkRejectSubmissions,
  bulkDeleteSubmissions
} from '../controllers/approvalController.js';

const router = express.Router();

// GET all submissions
router.get('/', getAllSubmissions);

// GET pending submissions
router.get('/pending', getPendingSubmissions);

// PUT approve submission
router.put('/:id/approve', approveSubmission);

// PUT reject submission
router.put('/:id/reject', rejectSubmission);

// DELETE individual submission
router.delete('/:id/delete', deleteSubmission);

// POST bulk approve submissions
router.post('/bulk/approve', bulkApproveSubmissions);

// POST bulk reject submissions
router.post('/bulk/reject', bulkRejectSubmissions);

// POST bulk delete submissions
router.post('/bulk/delete', bulkDeleteSubmissions);

export default router;