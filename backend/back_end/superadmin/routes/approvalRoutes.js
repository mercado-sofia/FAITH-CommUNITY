import express from 'express';
import {
  submitOrgUpdate,
  getPendingUpdates,
  actOnUpdate
} from '../controllers/approvalController.js';

const router = express.Router();

// Error handling middleware
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

/**
 * @route POST /api/approvals/submit
 * @desc Submit a pending update (admin)
 */
router.post('/submit', asyncHandler(submitOrgUpdate));

/**
 * @route GET /api/approvals/pending
 * @desc View all pending updates (superadmin)
 */
router.get('/pending', asyncHandler(getPendingUpdates));

/**
 * @route PUT /api/approvals/:id/action
 * @desc Approve or reject a pending update (superadmin)
 */
router.put('/:id/action', asyncHandler(actOnUpdate));

// Error handling middleware
router.use((err, req, res, next) => {
  console.error('Approval route error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
    details: process.env.NODE_ENV === 'development' ? err : undefined
  });
});

export default router;
