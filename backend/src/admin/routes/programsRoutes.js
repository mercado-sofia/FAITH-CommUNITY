//controller: programsController.js
import express from 'express';
import multer from 'multer';
import path from 'path';
import { verifyAdminOrSuperadmin } from '../../superadmin/middleware/verifyAdminOrSuperadmin.js';
import { 
  getAdminPrograms,
  getProgramsByOrg, 
  getApprovedPrograms, 
  getApprovedProgramsByOrg,
  deleteProgramSubmission,
  updateProgram,
  getProgramBySlug,
  getOtherProgramsByOrganization,
  getFeaturedPrograms,
  getAllFeaturedPrograms,
  toggleFeaturedStatus,
  getProgramById,
  markProgramAsCompleted,
  markProgramAsActive,
  // Functions from programProjectsController
  addProgramProject,
  updateProgramProject,
  getProgramProjects,
  getAllProgramsForSuperadmin,
  getProgramsStatistics
} from '../controllers/programsController.js';

const router = express.Router();

// Apply authentication middleware to admin routes
router.use('/admin', verifyAdminOrSuperadmin);

// Import Cloudinary upload configuration
import { cloudinaryUploadConfigs } from '../../utils/cloudinaryUpload.js';

// Use Cloudinary upload configuration for programs
const upload = cloudinaryUploadConfigs.programMain;

// Admin routes
router.get('/admin/programs', getAdminPrograms);
router.get('/admin/programs/:orgId', getProgramsByOrg);
router.get('/admin/programs/single/:id', getProgramById);
router.put('/admin/programs/:id', updateProgram);
router.put('/admin/programs/:id/mark-completed', markProgramAsCompleted);
router.put('/admin/programs/:id/mark-active', markProgramAsActive);
router.delete('/admin/programs/:id', deleteProgramSubmission);

// Superadmin routes
router.get('/superadmin/featured-projects', getAllFeaturedPrograms);
router.put('/superadmin/programs/:id/featured', toggleFeaturedStatus);

// ===================== Program Projects routes (from programProjects.js) =====================
router.post('/program-projects', verifyAdminOrSuperadmin, upload.single('image'), addProgramProject);
router.put('/program-projects/:id', verifyAdminOrSuperadmin, upload.single('image'), updateProgramProject);
router.get('/program-projects', verifyAdminOrSuperadmin, getProgramProjects);

// ================= Superadmin routes for program projects =====================
router.get('/program-projects/superadmin/all', verifyAdminOrSuperadmin, getAllProgramsForSuperadmin);
router.get('/program-projects/superadmin/statistics', verifyAdminOrSuperadmin, getProgramsStatistics);

// Public routes
router.get('/programs', getApprovedPrograms);
router.get('/programs/featured', getFeaturedPrograms);
router.get('/programs/org/:orgId', getApprovedProgramsByOrg);
router.get('/programs/slug/:slug', getProgramBySlug);
router.get('/programs/org/:organizationId/other/:excludeProgramId', getOtherProgramsByOrganization);

export default router;
