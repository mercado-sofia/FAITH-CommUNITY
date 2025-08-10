import express from 'express';
import dotenv from 'dotenv';
import {
  getAllVolunteers,
  getVolunteersByOrganization,
  getVolunteersByAdminOrg,
  getVolunteerById,
  updateVolunteerStatus,
  softDeleteVolunteer,
  submitVolunteer,
  testGet,
  testPost,
  upload,
  getApprovedUpcomingPrograms,
} from '../controllers/applyController.js';

dotenv.config();
const router = express.Router();

router.get('/test', testGet);
router.get('/volunteers', getAllVolunteers);
router.get('/volunteers/organization/:orgId', getVolunteersByOrganization);
router.get('/volunteers/admin/:adminId', getVolunteersByAdminOrg);
router.get('/volunteers/:id', getVolunteerById);
router.put('/volunteers/:id/status', updateVolunteerStatus);
router.put('/volunteers/:id/soft-delete', softDeleteVolunteer);
router.post('/apply', upload, submitVolunteer);
router.post('/test-post', testPost);
router.get('/programs/approved/upcoming', getApprovedUpcomingPrograms);

export default router;