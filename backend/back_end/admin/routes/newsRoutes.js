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
  deleteNewsSubmission,
  getRecentlyDeletedNews,
  restoreNews,
  permanentlyDeleteNews,
  updateNews,
} from "../controllers/newsController.js";

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = "uploads/news/";
    // Create directory if it doesn't exist
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    // Generate unique filename with timestamp and random string
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const fileFilter = (req, file, cb) => {
  // Accept only image files
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed!'), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  }
});

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

// Generic CRUD operations for individual news items - with file upload for updates
router.put("/:id", upload.single('featured_image'), updateNews);
router.delete("/:id", deleteNewsSubmission);
router.get("/:id", getNewsById);

export default router;
