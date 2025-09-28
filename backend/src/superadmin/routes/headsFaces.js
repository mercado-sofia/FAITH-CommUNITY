import express from 'express';
import {
  getHeadsFaces,
  getHeadsFacesById,
  createHeadsFaces,
  updateHeadsFaces,
  deleteHeadsFaces,
  createOrUpdateHeadFaces
} from '../controllers/headsFacesController.js';
import { verifyAdminOrSuperadmin } from '../middleware/verifyAdminOrSuperadmin.js';

const router = express.Router();

// Public route for getting heads of FACES (no auth required)
router.get('/', getHeadsFaces);
router.get('/:id', getHeadsFacesById);

// Protected routes for superadmin management
router.post('/', verifyAdminOrSuperadmin, createHeadsFaces);
router.put('/:id', verifyAdminOrSuperadmin, updateHeadsFaces);
router.delete('/:id', verifyAdminOrSuperadmin, deleteHeadsFaces);

// Single head management endpoint
router.post('/manage', verifyAdminOrSuperadmin, createOrUpdateHeadFaces);

export default router;
