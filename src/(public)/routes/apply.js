import express from 'express';
import dotenv from 'dotenv';
import {
  submitVolunteer,
  testGet,
  testPost,
  testAuth,
  getApprovedUpcomingPrograms,
} from '../controllers/volunteerController.js';
import { verifyToken } from '../controllers/userController.js';

dotenv.config();
const router = express.Router();

router.get('/test', testGet);
router.post('/apply', verifyToken, submitVolunteer);
router.post('/test-post', testPost);
router.get('/test-auth', verifyToken, testAuth);
router.get('/programs/approved/upcoming', verifyToken, getApprovedUpcomingPrograms);

export default router;