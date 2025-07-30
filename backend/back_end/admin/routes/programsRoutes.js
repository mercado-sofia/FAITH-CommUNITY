// routes/programsRoutes.js
import express from 'express';
import { 
  getProgramsByOrg, 
  getApprovedPrograms, 
  getApprovedProgramsByOrg,
  deleteProgramSubmission 
} from '../controllers/programsController.js';

const router = express.Router();

// Admin routes
router.get('/admin/programs/:orgId', getProgramsByOrg);
router.delete('/admin/programs/:id', deleteProgramSubmission);

// Public routes
router.get('/programs', getApprovedPrograms);
router.get('/programs/org/:orgId', getApprovedProgramsByOrg);

export default router;
