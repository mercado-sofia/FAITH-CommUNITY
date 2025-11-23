//controller: newsController.js

import { Router } from "express";
import {
  createNews,
  getNewsByOrg,
  getApprovedNews,
  getApprovedNewsByOrg,
  getNewsById,
  getNewsBySlug,
  deleteNewsSubmission,
  getArchivedNews,
  restoreNews,
  permanentlyDeleteNews,
  updateNews,
  autoUpdateScheduledNews,
} from "../controllers/newsController.js";

// Import Cloudinary upload configuration
import { cloudinaryUploadConfigs } from '../../utils/cloudinaryUpload.js';

// Use Cloudinary upload configuration for news
const upload = cloudinaryUploadConfigs.news;

const router = Router();

// Error handler for multer
const handleMulterError = (err, req, res, next) => {
  if (err) {
    if (process.env.NODE_ENV === 'development') {
      console.error('=== MULTER ERROR ===');
      console.error('Multer error:', err);
    }
    return res.status(400).json({
      success: false,
      message: err.message || 'File upload error'
    });
  }
  next();
};

// Create news for an org (orgId can be numeric or acronym) - with file upload
router.post("/:orgId", (req, res, next) => {
  upload.single('featured_image')(req, res, (err) => {
    if (err) {
      console.error('[newsRoutes] Multer error:', err);
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ success: false, message: 'Image file is too large. Maximum size is 5MB.' });
      }
      if (err.message && err.message.includes('Only')) {
        return res.status(400).json({ success: false, message: err.message });
      }
      return res.status(400).json({ success: false, message: 'File upload error: ' + err.message });
    }
    next();
  });
}, createNews);
router.post("/:orgId", 
  upload.single('featured_image'),
  handleMulterError,
  async (req, res, next) => {
    try {
      await createNews(req, res);
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('[newsRoutes] Unhandled error in createNews route:', {
          message: error?.message,
          name: error?.name,
          stack: error?.stack,
          headersSent: res.headersSent
        });
      }
      if (!res.headersSent) {
        res.setHeader('Content-Type', 'application/json');
        return res.status(500).json({
          success: false,
          message: "Failed to create news",
          error: error?.message || "Internal server error"
        });
      }
      next(error);
    }
  }
);

// Root -> return approved news (so GET /api/news works)
// Wrap in error handler to ensure proper error responses
router.get("/", async (req, res, next) => {
  try {
    await getApprovedNews(req, res);
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('[newsRoutes] Unhandled error in getApprovedNews route:', {
        message: error?.message,
        name: error?.name,
        stack: error?.stack,
        headersSent: res.headersSent
      });
    }
    if (!res.headersSent) {
      res.setHeader('Content-Type', 'application/json');
      return res.status(500).json({
        success: false,
        message: "Failed to fetch news",
        error: error?.message || "Internal server error"
      });
    }
    next(error);
  }
});

// Other specific endpoints
router.get("/approved", getApprovedNews);
router.get("/approved/:orgId", getApprovedNewsByOrg);
router.get("/org/:orgId", getNewsByOrg);
router.get("/archived/:orgId", getArchivedNews);
router.patch("/restore/:id", restoreNews);
router.delete("/permanent/:id", permanentlyDeleteNews);

// Manual trigger for scheduled news check (for monitoring/debugging)
// This endpoint allows manual checking of scheduled news without waiting for the 5-minute interval
router.post("/check-scheduled", async (req, res) => {
  try {
    const result = await autoUpdateScheduledNews();
    res.json({
      success: result.success,
      message: result.success 
        ? `Checked scheduled news. ${result.updatedCount || 0} item(s) published.`
        : 'Error checking scheduled news',
      updatedCount: result.updatedCount || 0,
      error: result.error || null
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to check scheduled news',
      error: error.message
    });
  }
});

// Get news by slug (must come before /:id route)
router.get("/slug/:slug", getNewsBySlug);

// Generic CRUD operations for individual news items - with file upload for updates
router.put("/:id", (req, res, next) => {
  upload.single('featured_image')(req, res, (err) => {
    if (err) {
      console.error('[newsRoutes] Multer error on update:', err);
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ success: false, message: 'Image file is too large. Maximum size is 5MB.' });
      }
      if (err.message && err.message.includes('Only')) {
        return res.status(400).json({ success: false, message: err.message });
      }
      return res.status(400).json({ success: false, message: 'File upload error: ' + err.message });
    }
    next();
  });
}, updateNews);
router.delete("/:id", deleteNewsSubmission);
router.get("/:id", getNewsById);

export default router;