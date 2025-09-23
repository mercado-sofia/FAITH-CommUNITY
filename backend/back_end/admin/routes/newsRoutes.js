//controller: newsController.js

import { Router } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import {
  createNews,
  getNewsByOrg,
  getApprovedNews,
  getApprovedNewsByOrg,
  getNewsById,
  getNewsBySlug,
  deleteNewsSubmission,
  getRecentlyDeletedNews,
  restoreNews,
  permanentlyDeleteNews,
  updateNews,
} from "../controllers/newsController.js";

// Import Cloudinary upload configuration
import { cloudinaryUploadConfigs } from '../../utils/cloudinaryUpload.js';

// Use Cloudinary upload configuration for news
const upload = cloudinaryUploadConfigs.news;

const router = Router();

// Create news for an org (orgId can be numeric or acronym) - with file upload
router.post("/:orgId", upload.single('featured_image'), createNews);

// Root -> return approved news (so GET /api/news works)
router.get("/", getApprovedNews);

// Other specific endpoints
router.get("/approved", getApprovedNews);
router.get("/approved/:orgId", getApprovedNewsByOrg);
router.get("/org/:orgId", getNewsByOrg);
router.get("/deleted/:orgId", getRecentlyDeletedNews);
router.patch("/restore/:id", restoreNews);
router.delete("/permanent/:id", permanentlyDeleteNews);

// Get news by slug (must come before /:id route)
router.get("/slug/:slug", getNewsBySlug);

// Generic CRUD operations for individual news items - with file upload for updates
router.put("/:id", upload.single('featured_image'), updateNews);
router.delete("/:id", deleteNewsSubmission);
router.get("/:id", getNewsById);

export default router;
