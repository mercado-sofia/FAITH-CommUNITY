const express = require('express');
const router = express.Router();
const {
  getAllProgramsByOrganization,
  getProgramsStatistics,
  getProgramById,
  getProgramsByOrganizationId
} = require('../controllers/programsController');

// Routes for superadmin programs management
router.get('/all', getAllProgramsByOrganization);
router.get('/statistics', getProgramsStatistics);
router.get('/organization/:orgId', getProgramsByOrganizationId);
router.get('/:id', getProgramById);

module.exports = router;
