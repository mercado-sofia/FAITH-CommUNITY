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
  getApprovedHighlights,
  getFeaturedHighlights,
  addFeaturedHighlight,
  removeFeaturedHighlight,
  checkFeaturedStatus
} from '../controllers/highlightsController.js';

const router = express.Router();

// Apply authentication middleware to all other highlight routes
router.use(verifyAdminOrSuperadmin);

// Get all highlights for admin's organization
router.get('/', getAdminHighlights);

// Superadmin routes for highlight approval (must be before /:id routes)
router.get('/approval/all', getAllHighlightsForApproval);
router.put('/approval/:id/status', updateHighlightStatus);

// Featured highlights routes (must be before /:id routes)
router.get('/featured', getFeaturedHighlights);

// Get a single highlight by ID
router.get('/:id', getHighlightById);

// Featured status and actions for specific highlight (must be after /:id route)
router.get('/:id/featured', checkFeaturedStatus);
router.post('/:id/feature', addFeaturedHighlight);
router.post('/:id/unfeature', removeFeaturedHighlight);

// Create a new highlight
router.post('/', createHighlight);

// Update a highlight
router.put('/:id', updateHighlight);

// Delete a highlight
router.delete('/:id', deleteHighlight);

export default router;