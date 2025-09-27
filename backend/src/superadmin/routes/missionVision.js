import express from 'express';
import {
  getMissionVision,
  createMissionVision,
  updateMissionVision,
  deleteMissionVision
} from '../controllers/missionVisionController.js';
import { verifyAdminOrSuperadmin } from '../middleware/verifyAdminOrSuperadmin.js';

const router = express.Router();

// Public route for getting mission and vision (no auth required)
router.get('/', getMissionVision);

// Protected routes for superadmin management
router.post('/', verifyAdminOrSuperadmin, createMissionVision);
router.put('/:id', verifyAdminOrSuperadmin, updateMissionVision);
router.delete('/:id', verifyAdminOrSuperadmin, deleteMissionVision);

export default router;
