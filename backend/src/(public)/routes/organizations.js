import express from 'express';
import { getAllOrganizations, getHeroSection } from '../controllers/organizationsController.js';

const router = express.Router();

// GET all organizations from admins table
router.get('/organizations', getAllOrganizations);

// GET hero section data for public interface
router.get('/hero-section', getHeroSection);

export default router;
