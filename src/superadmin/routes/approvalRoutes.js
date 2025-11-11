import express from 'express';
import { verifyAdminOrSuperadmin } from '../middleware/verifyAdminOrSuperadmin.js';
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

// All routes require admin or superadmin authentication
router.use(verifyAdminOrSuperadmin);

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

// Note: Collaborative program routes removed as they're no longer needed
// Collaborative programs are now handled as regular submissions

export default router;