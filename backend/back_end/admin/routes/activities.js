import express from 'express';
import {
  createActivity,
  getAllActivities,
  getActivityById,
  updateActivity,
  deleteActivity
} from '../controllers/activityController.js';

const router = express.Router();

router.post('/', createActivity);
router.get('/', getAllActivities);
router.get('/:id', getActivityById);
router.put('/:id', updateActivity);
router.delete('/:id', deleteActivity);

export default router;
