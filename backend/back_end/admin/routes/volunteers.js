//controller: volunteerController.js

import express from 'express';
import {
  applyVolunteer,
  getAllVolunteers,
  getVolunteerById,
  updateVolunteerStatus
} from '../controllers/volunteerController.js';
import {
  getVolunteersByAdminOrg
} from '../../for_public/controllers/applyController.js';

const router = express.Router();

router.post('/', applyVolunteer);
router.get('/', getAllVolunteers);
router.get('/admin/:adminId', getVolunteersByAdminOrg);
router.get('/:id', getVolunteerById);
router.put('/:id/status', updateVolunteerStatus);

export default router;