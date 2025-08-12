const express = require('express');
const router = express.Router();
const {
  getAllFeaturedProjects,
  getFeaturedProjectById
} = require('../controllers/featuredProjectsController');

// Routes for featured projects
router.get('/', getAllFeaturedProjects);
router.get('/:id', getFeaturedProjectById);

module.exports = router;