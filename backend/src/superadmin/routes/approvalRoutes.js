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
  bulkDeleteSubmissions,
  getPendingCollaborativePrograms,
  approveCollaborativeProgram,
  rejectCollaborativeProgram
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

// GET pending collaborative programs
router.get('/collaborative-programs', getPendingCollaborativePrograms);

// PUT approve collaborative program
router.put('/collaborative-programs/:programId/approve', approveCollaborativeProgram);

// PUT reject collaborative program
router.put('/collaborative-programs/:programId/reject', rejectCollaborativeProgram);

export default router;