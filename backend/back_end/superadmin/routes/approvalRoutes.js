import express from 'express';
import { approveSubmission } from '../controllers/approvalController.js';

const router = express.Router();
router.put('/:id/approve', approveSubmission);

export default router;