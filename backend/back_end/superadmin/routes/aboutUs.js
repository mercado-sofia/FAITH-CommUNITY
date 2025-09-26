import express from 'express';
import multer from 'multer';
import {
  getAboutUs,
  updateAboutUs,
  addExtensionCategory,
  updateExtensionCategory,
  deleteExtensionCategory,
  uploadAboutUsImage,
  deleteAboutUsImage
} from '../controllers/aboutUsController.js';
import { verifySuperadminToken } from '../controllers/superadminAuthController.js';

const router = express.Router();

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    // Allow only image files
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'), false);
    }
  }
});

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

// Image upload route
router.post('/upload-image', (req, res, next) => {
  console.log('POST /about-us/upload-image route hit');
  next();
}, upload.single('image'), uploadAboutUsImage);

// Image delete route
router.delete('/image', (req, res, next) => {
  console.log('DELETE /about-us/image route hit');
  next();
}, deleteAboutUsImage);

export default router;
