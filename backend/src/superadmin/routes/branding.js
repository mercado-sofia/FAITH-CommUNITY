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
  res.json({ success: true, message: 'Branding routes are working' });
});

// Public route for getting branding data (no authentication required)
router.get('/public', getBranding);

// Public route for getting site name (no authentication required)
router.get('/site-name/public', getSiteName);

// Apply authentication middleware to all other routes
router.use(verifySuperadminToken);

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

// Routes
router.get('/', getBranding);

router.put('/', updateBranding);

router.post('/upload-logo', upload.single('logo'), handleMulterError, uploadLogo);

router.post('/upload-favicon', upload.single('favicon'), handleMulterError, uploadFavicon);

router.delete('/logo', deleteLogo);

router.delete('/favicon', deleteFavicon);

router.post('/upload-name', upload.single('name'), handleMulterError, uploadName);

router.delete('/name', deleteName);

// Site name routes
router.get('/site-name', getSiteName);

router.put('/site-name', updateSiteName);

export default router;
