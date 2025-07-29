import express from 'express';
import { approveSubmission, getPendingSubmissions, rejectSubmission } from '../controllers/approvalController.js';

const router = express.Router();

// GET pending submissions
router.get('/pending', getPendingSubmissions);

// PUT approve submission
router.put('/:id/approve', approveSubmission);

// PUT reject submission
router.put('/:id/reject', rejectSubmission);

export default router;