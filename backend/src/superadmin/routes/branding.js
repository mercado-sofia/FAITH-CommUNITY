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

// Public route for getting branding data (no authentication required)
router.get('/public', getBranding);

// Public route for getting site name (no authentication required)
router.get('/site-name/public', getSiteName);

// Error handling middleware for multer
const handleMulterError = (error, req, res, next) => {
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

// File upload routes - MUST be defined BEFORE auth middleware
// Multer needs to process the request body before any other middleware
router.post('/upload-logo', verifySuperadminToken, upload.single('logo'), handleMulterError, uploadLogo);
router.post('/upload-favicon', verifySuperadminToken, upload.single('favicon'), handleMulterError, uploadFavicon);
router.post('/upload-name', verifySuperadminToken, upload.single('name'), handleMulterError, uploadName);

// Apply authentication middleware to all other routes
router.use(verifySuperadminToken);

// Routes
router.get('/', getBranding);
router.put('/', updateBranding);
router.delete('/logo', deleteLogo);
router.delete('/favicon', deleteFavicon);
router.delete('/name', deleteName);

// Site name routes
router.get('/site-name', getSiteName);

router.put('/site-name', updateSiteName);

export default router;
