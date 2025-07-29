import express from 'express';
import { getAllOrganizations } from '../controllers/organizationsController.js';

const router = express.Router();

// GET all organizations from admins table
router.get('/organizations', getAllOrganizations);

export default router;
