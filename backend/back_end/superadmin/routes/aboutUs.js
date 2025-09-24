import express from 'express';
import {
  getAboutUs,
  updateAboutUs,
  addExtensionCategory,
  updateExtensionCategory,
  deleteExtensionCategory
} from '../controllers/aboutUsController.js';
import { verifySuperadminToken } from '../controllers/superadminAuthController.js';

const router = express.Router();

// Test endpoint to verify routes are working
router.get('/test', (req, res) => {
  console.log('About Us test endpoint hit');
  res.json({ success: true, message: 'About Us routes are working' });
});

// Public route for getting about us data (no authentication required)
router.get('/public', (req, res, next) => {
  console.log('GET /about-us/public route hit');
  next();
}, getAboutUs);

// Apply authentication middleware to all other routes
router.use((req, res, next) => {
  console.log('Authentication middleware hit for:', req.method, req.path);
  console.log('Authorization header:', req.headers.authorization);
  next();
}, verifySuperadminToken);

// Routes
router.get('/', (req, res, next) => {
  console.log('GET /about-us route hit');
  next();
}, getAboutUs);

router.put('/', (req, res, next) => {
  console.log('PUT /about-us route hit');
  next();
}, updateAboutUs);

// Extension category routes
router.post('/extension-categories', (req, res, next) => {
  console.log('POST /about-us/extension-categories route hit');
  next();
}, addExtensionCategory);

router.put('/extension-categories/:categoryIndex', (req, res, next) => {
  console.log('PUT /about-us/extension-categories/:categoryIndex route hit');
  next();
}, updateExtensionCategory);

router.delete('/extension-categories/:categoryIndex', (req, res, next) => {
  console.log('DELETE /about-us/extension-categories/:categoryIndex route hit');
  next();
}, deleteExtensionCategory);

export default router;
