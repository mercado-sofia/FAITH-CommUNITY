import express from 'express';
import {
  getAllProgramsByOrganization,
  getProgramsStatistics,
  getProgramById,
  getProgramsByOrganizationId
} from '../controllers/programsController.js';
import { verifySuperadminToken } from '../controllers/superadminAuthController.js';

const router = express.Router();

// SECURITY FIX: All superadmin routes require authentication
router.use(verifySuperadminToken);

// Routes for superadmin programs management
router.get('/all', getAllProgramsByOrganization);
router.get('/statistics', getProgramsStatistics);
router.get('/organization/:orgId', getProgramsByOrganizationId);
router.get('/:id', getProgramById);

export default router;
