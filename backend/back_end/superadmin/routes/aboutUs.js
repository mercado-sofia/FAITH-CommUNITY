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
  res.json({ success: true, message: 'About Us routes are working' });
});

// Public route for getting about us data (no authentication required)
router.get('/public', getAboutUs);

// Apply authentication middleware to all other routes
router.use(verifySuperadminToken);

// Routes
router.get('/', getAboutUs);

router.put('/', updateAboutUs);

// Extension category routes
router.post('/extension-categories', addExtensionCategory);

router.put('/extension-categories/:categoryIndex', updateExtensionCategory);

router.delete('/extension-categories/:categoryIndex', deleteExtensionCategory);

// Image upload route
router.post('/upload-image', upload.single('image'), uploadAboutUsImage);

// Image delete route
router.delete('/image', deleteAboutUsImage);

export default router;
