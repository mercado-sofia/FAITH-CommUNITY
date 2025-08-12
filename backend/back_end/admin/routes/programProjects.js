import express from 'express';
import {
  addProgramProject,
  getProgramProjects,
  getAllProgramsForSuperadmin,
  getProgramsStatistics
} from '../controllers/programProjectsController.js';

const router = express.Router();

// Admin routes
router.post('/', addProgramProject);
router.get('/', getProgramProjects);

// Superadmin routes
router.get('/superadmin/all', getAllProgramsForSuperadmin);
router.get('/superadmin/statistics', getProgramsStatistics);

export default router;