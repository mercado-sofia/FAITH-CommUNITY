import express from 'express';
import { cloudinaryUploadConfigs } from '../../utils/cloudinaryUpload.js';
import {
  getBranding,
  updateBranding,
  uploadLogo,
  uploadFavicon,
  deleteLogo,
  deleteFavicon,
  uploadName,
  deleteName,
  getSiteName,
  updateSiteName
} from '../controllers/brandingController.js';
import { verifySuperadminToken } from '../controllers/superadminAuthController.js';

const router = express.Router();

// Use Cloudinary upload configuration for branding
const upload = cloudinaryUploadConfigs.branding;

// Test endpoint to verify routes are working
router.get('/test', (req, res) => {
  console.log('Branding test endpoint hit');
  res.json({ success: true, message: 'Branding routes are working' });
});

// Public route for getting branding data (no authentication required)
router.get('/public', (req, res, next) => {
  console.log('GET /branding/public route hit');
  next();
}, getBranding);

// Public route for getting site name (no authentication required)
router.get('/site-name/public', (req, res, next) => {
  console.log('GET /branding/site-name/public route hit');
  next();
}, getSiteName);

// Apply authentication middleware to all other routes
router.use((req, res, next) => {
  console.log('Authentication middleware hit for:', req.method, req.path);
  console.log('Authorization header:', req.headers.authorization);
  next();
}, verifySuperadminToken);

// Error handling middleware for multer
const handleMulterError = (error, req, res, next) => {
  console.log('Multer error:', error);
  if (error.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({
      success: false,
      message: 'File too large. Maximum size is 2MB for branding files.'
    });
  }
  if (error.message.includes('Only image files')) {
    return res.status(400).json({
      success: false,
      message: error.message
    });
  }
  next(error);
};

// Routes
router.get('/', (req, res, next) => {
  console.log('GET /branding route hit');
  next();
}, getBranding);

router.put('/', (req, res, next) => {
  console.log('PUT /branding route hit');
  next();
}, updateBranding);

router.post('/upload-logo', (req, res, next) => {
  console.log('POST /branding/upload-logo route hit');
  next();
}, upload.single('logo'), handleMulterError, uploadLogo);

router.post('/upload-favicon', (req, res, next) => {
  console.log('POST /branding/upload-favicon route hit');
  next();
}, upload.single('favicon'), handleMulterError, uploadFavicon);

router.delete('/logo', (req, res, next) => {
  console.log('DELETE /branding/logo route hit');
  next();
}, deleteLogo);

router.delete('/favicon', (req, res, next) => {
  console.log('DELETE /branding/favicon route hit');
  next();
}, deleteFavicon);

router.post('/upload-name', (req, res, next) => {
  console.log('POST /branding/upload-name route hit');
  next();
}, upload.single('name'), handleMulterError, uploadName);

router.delete('/name', (req, res, next) => {
  console.log('DELETE /branding/name route hit');
  next();
}, deleteName);

// Site name routes
router.get('/site-name', (req, res, next) => {
  console.log('GET /branding/site-name route hit');
  next();
}, getSiteName);

router.put('/site-name', (req, res, next) => {
  console.log('PUT /branding/site-name route hit');
  next();
}, updateSiteName);

export default router;
