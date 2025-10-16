import express from 'express';
import { verifyAdminOrSuperadmin } from '../../superadmin/middleware/verifyAdminOrSuperadmin.js';
import {
  getAllAvailableAdmins,
  getAvailableAdmins,
  inviteCollaborator,
  getProgramCollaborators,
  removeCollaborator,
  optOutCollaboration,
  getCollaborationRequests,
  acceptCollaborationRequest,
  declineCollaborationRequest
} from '../controllers/collaborationController.js';

const router = express.Router();

// All routes require admin authentication
router.use(verifyAdminOrSuperadmin);

// Get all available admins (for new program creation)
router.get('/available-admins', getAllAvailableAdmins);

// Get available admins to invite for a specific program
router.get('/programs/:programId/available-admins', getAvailableAdmins);

// Invite collaborator to program
router.post('/programs/:programId/invite-collaborator', inviteCollaborator);

// Get program collaborators
router.get('/programs/:programId/collaborators', getProgramCollaborators);

// Remove collaborator from program
router.delete('/programs/:programId/collaborators/:adminId', removeCollaborator);

// Opt out of collaboration (for auto-accepted collaborations)
router.put('/collaborations/:collaborationId/opt-out', optOutCollaboration);

// Get collaboration requests (both sent and received)
router.get('/collaboration-requests', getCollaborationRequests);

// Accept collaboration request
router.put('/collaborations/:collaborationId/accept', acceptCollaborationRequest);

// Decline collaboration request
router.put('/collaborations/:collaborationId/decline', declineCollaborationRequest);

export default router;