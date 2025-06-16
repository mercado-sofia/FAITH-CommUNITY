import express from 'express';
import {
  addProgramProject,
  getProgramProjects
} from '../controllers/programProjectsController.js';

const router = express.Router();

// No multer middleware here
router.post('/', addProgramProject);
router.get('/', getProgramProjects);

export default router;