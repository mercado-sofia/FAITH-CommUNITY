import express from 'express';
import {
  getMissionVision,
  upsertMissionVision,
  updateMissionVision,
  deleteMissionVision
} from '../controllers/missionVisionController.js';
import { verifyAdminOrSuperadmin } from '../middleware/verifyAdminOrSuperadmin.js';

const router = express.Router();

// Public route for getting mission and vision (no auth required)
router.get('/', getMissionVision);

// Protected routes for superadmin management
// Use UPSERT to ensure only one Mission and one Vision exist
router.post('/', verifyAdminOrSuperadmin, upsertMissionVision);
router.put('/:id', verifyAdminOrSuperadmin, updateMissionVision);
router.delete('/:id', verifyAdminOrSuperadmin, deleteMissionVision);

export default router;
