//controller: volunteerController.js

import express from 'express';
import { verifyAdminOrSuperadmin } from '../../superadmin/middleware/verifyAdminOrSuperadmin.js';
import {
  applyVolunteer,
  getAllVolunteers,
  getVolunteerById,
  updateVolunteerStatus,
  getVolunteersByAdminOrg,
  getVolunteersByOrganization,
  getVolunteersByProgram,
  softDeleteVolunteer
} from '../../(public)/controllers/volunteerController.js';

const router = express.Router();

// Apply authentication middleware to all admin volunteer routes
router.use(verifyAdminOrSuperadmin);

router.post('/', applyVolunteer);
router.get('/', getAllVolunteers);
router.get('/organization/:orgId', getVolunteersByOrganization);
router.get('/admin/:adminId', getVolunteersByAdminOrg);
router.get('/program/:programId', getVolunteersByProgram);
router.put('/:id/status', updateVolunteerStatus);
router.put('/:id/soft-delete', softDeleteVolunteer);
router.get('/:id', getVolunteerById);

export default router;