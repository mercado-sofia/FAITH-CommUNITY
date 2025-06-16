import express from 'express';
import dotenv from 'dotenv';
import {
  getAllVolunteers,
  submitVolunteer,
  testGet,
  testPost,
  upload,
} from '../controllers/applyController.js';

dotenv.config();
const router = express.Router();

router.get('/test', testGet);
router.get('/apply', getAllVolunteers);
router.post('/apply', upload, submitVolunteer);
router.post('/test-post', testPost);

export default router;