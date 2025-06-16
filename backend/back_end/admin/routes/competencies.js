import express from 'express';
import {
  addCompetency,
  getCompetencies,
  getAllCompetencies,
  deleteCompetency
} from '../controllers/competencyController.js';

const router = express.Router();

router.post('/', addCompetency);
router.get('/', getAllCompetencies); // ✅ NEW
router.get('/:organization_id', getCompetencies);
router.delete('/:id', deleteCompetency);

export default router;
