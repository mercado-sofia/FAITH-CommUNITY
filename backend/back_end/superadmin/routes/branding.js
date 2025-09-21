import express from 'express';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
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
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure branding uploads directory exists
const brandingUploadsDir = path.join(__dirname, '../../../uploads/branding');
import fs from 'fs';
if (!fs.existsSync(brandingUploadsDir)) {
  fs.mkdirSync(brandingUploadsDir, { recursive: true });
}

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, brandingUploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const extension = path.extname(file.originalname);
    cb(null, file.fieldname + '-' + uniqueSuffix + extension);
  }
});

// File filter for images
const fileFilter = (req, file, cb) => {
  console.log('File filter called for:', file.originalname, file.mimetype);
  const allowedTypes = /jpeg|jpg|png|gif|svg|ico/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);

  console.log('File filter result:', { extname, mimetype, allowed: mimetype && extname });

  if (mimetype && extname) {
    return cb(null, true);
  } else {
    console.log('File rejected:', file.originalname);
    cb(new Error('Only image files (JPEG, JPG, PNG, GIF, SVG, ICO) are allowed!'));
  }
};

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: fileFilter
});

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
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: 'File too large. Maximum size is 5MB.'
      });
    }
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
