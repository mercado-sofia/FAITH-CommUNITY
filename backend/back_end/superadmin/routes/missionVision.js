import express from 'express';
import {
  getMissionVision,
  createMissionVision,
  updateMissionVision,
  deleteMissionVision
} from '../controllers/missionVisionController.js';

const router = express.Router();

router.get('/', getMissionVision);
router.post('/', createMissionVision);
router.put('/:id', updateMissionVision);
router.delete('/:id', deleteMissionVision);

export default router;
