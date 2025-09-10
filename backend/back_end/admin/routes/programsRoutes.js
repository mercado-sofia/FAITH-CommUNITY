//controller: programsController.js
import express from 'express';
import multer from 'multer';
import path from 'path';
import { 
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
  // Functions from programProjectsController
  addProgramProject,
  updateProgramProject,
  getProgramProjects,
  getAllProgramsForSuperadmin,
  getProgramsStatistics
} from '../controllers/programsController.js';

const router = express.Router();

// Multer configuration for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Make sure your app.js creates this folder at startup (you already do)
    cb(null, path.join(process.cwd(), 'uploads'));
  },
  filename: (req, file, cb) => {
    const sanitized = file.originalname.replace(/\s+/g, '_');
    cb(null, `${Date.now()}_${sanitized}`);
  },
});
const upload = multer({ storage });

// Admin routes
router.get('/admin/programs/:orgId', getProgramsByOrg);
router.get('/admin/programs/single/:id', getProgramById);
router.put('/admin/programs/:id', updateProgram);
router.delete('/admin/programs/:id', deleteProgramSubmission);

// Superadmin routes
router.get('/superadmin/featured-projects', getAllFeaturedPrograms);
router.put('/superadmin/programs/:id/featured', toggleFeaturedStatus);

// ===================== Program Projects routes (from programProjects.js) =====================
router.post('/program-projects', upload.single('image'), addProgramProject);
router.put('/program-projects/:id', upload.single('image'), updateProgramProject);
router.get('/program-projects', getProgramProjects);

// ================= Superadmin routes for program projects =====================
router.get('/program-projects/superadmin/all', getAllProgramsForSuperadmin);
router.get('/program-projects/superadmin/statistics', getProgramsStatistics);

// Public routes
router.get('/programs', getApprovedPrograms);
router.get('/programs/featured', getFeaturedPrograms);
router.get('/programs/org/:orgId', getApprovedProgramsByOrg);
router.get('/programs/slug/:slug', getProgramBySlug);
router.get('/programs/org/:organizationId/other/:excludeProgramId', getOtherProgramsByOrganization);

export default router;
