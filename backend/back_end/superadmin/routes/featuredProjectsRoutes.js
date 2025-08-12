import express from 'express';
import {
  getAllFeaturedProjects,
  getFeaturedProjectById,
  addFeaturedProject,
  removeFeaturedProject,
  checkFeaturedStatus
} from '../controllers/featuredProjectsController.js';

const router = express.Router();

// Routes for featured projects
router.get('/', getAllFeaturedProjects);
router.get('/status/:programId', checkFeaturedStatus);
router.get('/:id', getFeaturedProjectById);
router.post('/', addFeaturedProject);
router.delete('/program/:programId', removeFeaturedProject);

export default router;