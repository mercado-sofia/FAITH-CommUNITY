//controller: highlightsController.js (table: admin_highlights)
import express from 'express';
import { verifyAdminOrSuperadmin } from '../../superadmin/middleware/verifyAdminOrSuperadmin.js';
import {
  getAdminHighlights,
  getHighlightById,
  createHighlight,
  updateHighlight,
  deleteHighlight,
  getAllHighlightsForApproval,
  updateHighlightStatus,
  getApprovedHighlights
} from '../controllers/highlightsController.js';

const router = express.Router();

// Apply authentication middleware to all other highlight routes
router.use(verifyAdminOrSuperadmin);

// Get all highlights for admin's organization
router.get('/', getAdminHighlights);

// Get a single highlight by ID
router.get('/:id', getHighlightById);

// Create a new highlight
router.post('/', createHighlight);

// Update a highlight
router.put('/:id', updateHighlight);

// Delete a highlight
router.delete('/:id', deleteHighlight);

// Superadmin routes for highlight approval
router.get('/approval/all', getAllHighlightsForApproval);
router.put('/approval/:id/status', updateHighlightStatus);

export default router;