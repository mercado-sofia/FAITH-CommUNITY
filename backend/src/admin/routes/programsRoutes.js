//controller: programsController.js
import express from 'express';
import path from 'path';
import multer from 'multer';
import { verifyAdminOrSuperadmin } from '../../superadmin/middleware/verifyAdminOrSuperadmin.js';
import { 
  getAdminPrograms,
  getProgramsByOrg, 
  getApprovedPrograms, 
  getApprovedProgramsByOrg,
  deleteProgramSubmission,
  updateProgram,
  getProgramBySlug,
  getRelatedProgramsByOrganization,
  getFeaturedPrograms,
  getAllFeaturedPrograms,
  toggleFeaturedStatus,
  getProgramById,
  markProgramAsActive,
  toggleVolunteerAcceptance,
  // Functions from programProjectsController
  addProgramProject,
  updateProgramProject,
  getProgramProjects,
  getAllProgramsForSuperadmin,
  getProgramsStatistics
} from '../controllers/programsController.js';
// Import upload configurations
import { cloudinaryUploadConfigs } from '../../utils/cloudinaryUpload.js';
import { s3UploadConfigs } from '../../utils/s3Upload.js';
import { uploadPostActReport } from '../controllers/postActReportController.js';

const router = express.Router();

// Apply authentication middleware to admin routes
router.use('/admin', verifyAdminOrSuperadmin);

// Use Cloudinary upload configuration for programs
const upload = cloudinaryUploadConfigs.programMain;

// Admin routes
router.get('/admin/programs', getAdminPrograms);
router.get('/admin/programs/:orgId', getProgramsByOrg);
router.get('/admin/programs/single/:id', getProgramById);
router.put('/admin/programs/:id', updateProgram);
router.put('/admin/programs/:id/mark-active', markProgramAsActive);
router.put('/admin/programs/:id/toggle-volunteers', toggleVolunteerAcceptance);
// Error handling middleware for Post Act Report multer errors
const handlePostActReportMulterError = (error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: 'File too large. Maximum size is 10MB for Post Act Reports.'
      });
    }
    if (error.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({
        success: false,
        message: 'Too many files. Only one file allowed.'
      });
    }
    return res.status(400).json({
      success: false,
      message: 'File upload error: ' + error.message
    });
  }
  
  // Handle file filter errors (wrong file type)
  if (error && error.message && error.message.includes('Only')) {
    return res.status(400).json({
      success: false,
      message: error.message
    });
  }
  
  next(error);
};

// Post Act Report upload (using S3 upload configuration)
// This accepts images, PDFs, and document files (DOC, DOCX) and uploads to S3
router.post(
  '/admin/programs/:id/post-act-report',
  (req, res, next) => {
    s3UploadConfigs.postActReport.single('file')(req, res, (err) => {
      if (err) {
        return handlePostActReportMulterError(err, req, res, next);
      }
      next();
    });
  },
  uploadPostActReport
);
router.delete('/admin/programs/:id', deleteProgramSubmission);

// Superadmin routes - require authentication
router.get('/superadmin/featured-projects', verifyAdminOrSuperadmin, getAllFeaturedPrograms);
router.put('/superadmin/programs/:id/featured', verifyAdminOrSuperadmin, toggleFeaturedStatus);

// ===================== Program Projects routes (from programProjects.js) =====================
// SECURITY FIX: Removed direct program creation endpoint to enforce submission workflow
// All new programs must go through /api/submissions for superadmin approval
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
router.get('/programs/org/:organizationId/other/:excludeProgramId', getRelatedProgramsByOrganization);

export default router;