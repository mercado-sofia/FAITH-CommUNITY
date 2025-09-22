//controller: volunteerController.js

import express from 'express';
import {
  applyVolunteer,
  getAllVolunteers,
  getVolunteerById,
  updateVolunteerStatus,
  getVolunteersByAdminOrg,
  getVolunteersByOrganization,
  softDeleteVolunteer
} from '../../for_public/controllers/volunteerController.js';

const router = express.Router();

router.post('/', applyVolunteer);
router.get('/', getAllVolunteers);
router.get('/organization/:orgId', getVolunteersByOrganization);
router.get('/admin/:adminId', getVolunteersByAdminOrg);
router.get('/:id', getVolunteerById);
router.put('/:id/status', updateVolunteerStatus);
router.put('/:id/soft-delete', softDeleteVolunteer);

export default router;