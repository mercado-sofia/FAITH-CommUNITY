import express from 'express';
import {
  getHeadsFaces,
  getHeadsFacesById,
  createHeadsFaces,
  updateHeadsFaces,
  createOrUpdateHeadFaces,
  uploadHeadsFacesImage
} from '../controllers/headsFacesController.js';
import { verifyAdminOrSuperadmin } from '../middleware/verifyAdminOrSuperadmin.js';
import { cloudinaryUploadConfigs } from '../../utils/cloudinaryUpload.js';

const router = express.Router();

// Use Cloudinary upload configuration for heads faces
const upload = cloudinaryUploadConfigs.organizationHead;

// Error handling middleware for multer
const handleMulterError = (error, req, res, next) => {
  if (error.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({
      success: false,
      message: 'File too large. Maximum size is 3MB for head photos.'
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

// Public route for getting heads of FACES (no auth required)
router.get('/', getHeadsFaces);
router.get('/:id', getHeadsFacesById);

// Protected routes for superadmin management
router.post('/', verifyAdminOrSuperadmin, createHeadsFaces);
router.put('/:id', verifyAdminOrSuperadmin, updateHeadsFaces);

// Single head management endpoint
router.post('/manage', verifyAdminOrSuperadmin, createOrUpdateHeadFaces);

// Upload image endpoint
router.post('/upload-image', verifyAdminOrSuperadmin, upload.single('image'), handleMulterError, uploadHeadsFacesImage);

export default router;
