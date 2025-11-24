import express from 'express';
import dotenv from 'dotenv';
import {
  submitVolunteer,
  getApprovedUpcomingPrograms,
} from '../controllers/volunteerController.js';
import { verifyToken } from '../controllers/userController.js';

dotenv.config();
const router = express.Router();

router.post('/apply', verifyToken, submitVolunteer);
router.get('/programs/approved/upcoming', getApprovedUpcomingPrograms);

export default router;