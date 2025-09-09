//controller: programsController.js
import express from 'express';
import { 
  getProgramsByOrg, 
  getApprovedPrograms, 
  getApprovedProgramsByOrg,
  deleteProgramSubmission,
  updateProgram,
  getProgramBySlug,
  getOtherProgramsByOrganization
} from '../controllers/programsController.js';

const router = express.Router();

// Admin routes
router.get('/admin/programs/:orgId', getProgramsByOrg);
router.put('/admin/programs/:id', updateProgram);
router.delete('/admin/programs/:id', deleteProgramSubmission);

// Public routes
router.get('/programs', getApprovedPrograms);
router.get('/programs/org/:orgId', getApprovedProgramsByOrg);
router.get('/programs/slug/:slug', getProgramBySlug);
router.get('/programs/org/:organizationId/other/:excludeProgramId', getOtherProgramsByOrganization);

export default router;
