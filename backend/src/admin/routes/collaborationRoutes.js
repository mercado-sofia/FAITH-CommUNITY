import express from 'express';
import { verifyAdminOrSuperadmin } from '../../superadmin/middleware/verifyAdminOrSuperadmin.js';
import {
  getAllAvailableAdmins,
  getAvailableAdmins,
  inviteCollaborator,
  getProgramCollaborators,
  removeCollaborator,
  acceptCollaboration,
  declineCollaboration,
  optOutCollaboration,
  getCollaborationInvitations
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

// Accept collaboration invitation (legacy - for pending invitations)
router.put('/collaborations/:collaborationId/accept', acceptCollaboration);

// Decline collaboration invitation (legacy - for pending invitations)
router.put('/collaborations/:collaborationId/decline', declineCollaboration);

// Opt out of collaboration (for auto-accepted collaborations)
router.put('/collaborations/:collaborationId/opt-out', optOutCollaboration);

// Get collaboration invitations for current admin
router.get('/collaboration-invitations', getCollaborationInvitations);

export default router;
