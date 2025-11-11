import express from 'express';
import multer from 'multer';
import { verifySuperadminToken } from '../controllers/superadminAuthController.js';
import {
  getHeroSection,
  updateHeroSection,
  updateHeroSectionText,
  updateHeroSectionImageText,
  uploadHeroSectionVideo,
  uploadHeroSectionImage,
  deleteHeroSectionVideo,
  deleteHeroSectionImage,
  updateHeroSectionVideoLink
} from '../controllers/heroSectionController.js';

const router = express.Router();

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit
  },
  fileFilter: (req, file, cb) => {
    // Allow video and image files
    if (file.mimetype.startsWith('video/') || file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only video and image files are allowed'), false);
    }
  }
});

// Apply authentication middleware to all routes
router.use(verifySuperadminToken);

// GET /api/superadmin/hero-section - Get hero section data
router.get('/', getHeroSection);

// PUT /api/superadmin/hero-section - Update entire hero section (bulk update)
router.put('/', updateHeroSection);

// PUT /api/superadmin/hero-section/text - Update text content (tag/heading)
router.put('/text', updateHeroSectionText);

// PUT /api/superadmin/hero-section/image-text - Update image text content
router.put('/image-text', updateHeroSectionImageText);

// POST /api/superadmin/hero-section/upload-video - Upload video
router.post('/upload-video', upload.single('video'), uploadHeroSectionVideo);

// PUT /api/superadmin/hero-section/video-link - Update video link
router.put('/video-link', updateHeroSectionVideoLink);

// POST /api/superadmin/hero-section/upload-image - Upload image
router.post('/upload-image', upload.single('image'), uploadHeroSectionImage);

// DELETE /api/superadmin/hero-section/video - Delete video
router.delete('/video', deleteHeroSectionVideo);

// DELETE /api/superadmin/hero-section/image/:imageId - Delete image
router.delete('/image/:imageId', deleteHeroSectionImage);

export default router;
