//upload handler: uploadController.js

import express from 'express';
import { cloudinaryUploadConfigs } from '../../utils/cloudinaryUpload.js';
import { s3UploadConfigs } from '../../utils/s3Upload.js';
import { CLOUDINARY_FOLDERS } from '../../utils/cloudinaryConfig.js';
import { S3_FOLDERS } from '../../utils/s3Config.js';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import jwt from 'jsonwebtoken';
import { verifyAdminOrSuperadmin } from '../../superadmin/middleware/verifyAdminOrSuperadmin.js';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET;

// Authentication middleware for upload routes
const authenticateAdmin = (req, res, next) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Access token required' });
  }
  
  const token = authHeader.substring(7);
  
  try {
    const decoded = jwt.verify(token, JWT_SECRET, {
      issuer: process.env.JWT_ISS || "faith-community-api",
      audience: process.env.JWT_AUD || "faith-community-client",
    });
    req.admin = decoded;
    next();
  } catch (err) {
    return res.status(403).json({ error: 'Invalid or expired token' });
  }
};

// Using Cloudinary for file storage - no local uploads directory needed

// Generic upload handler that processes any file type
// Use dynamic middleware based on upload type from query params
router.post('/', verifyAdminOrSuperadmin, (req, res, next) => {
  // Check query params first (since body needs multer to parse)
  // Note: Body params are not available yet, so we use query params for middleware selection
  const uploadType = req.query.type || 'program';
  
  // Select appropriate multer config based on upload type
  let uploadMiddleware;
  if (uploadType === 'highlight') {
    uploadMiddleware = cloudinaryUploadConfigs.highlight.single('file');
  } else if (uploadType === 'program_post_act') {
    // Use S3 upload config for post-act reports
    // Note: This multer middleware only parses the file into memory (memoryStorage),
    // it does NOT upload to S3. The actual upload happens later via uploadSingleToS3()
    uploadMiddleware = s3UploadConfigs.postActReport.single('file');
  } else if (uploadType === 'program_additional') {
    uploadMiddleware = cloudinaryUploadConfigs.programAdditional.single('file');
  } else {
    uploadMiddleware = cloudinaryUploadConfigs.programMain.single('file');
  }
  
  // Apply the middleware
  uploadMiddleware(req, res, (err) => {
    if (err) {
      return next(err);
    }
    next();
  });
}, async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    
    // Determine upload type from request body or query params (body is now parsed)
    // IMPORTANT: The middleware was selected based on query.type (or default 'program') BEFORE body was parsed
    // We must ensure body.uploadType matches what the middleware used to avoid configuration mismatch
    const bodyUploadType = req.body.uploadType;
    const queryUploadType = req.query.type;
    const middlewareUploadType = queryUploadType || 'program'; // What middleware actually used for file processing
    
    // Validate consistency: if body.uploadType is provided, it must match what middleware used
    // This prevents the bug where middleware processes with one config but upload logic uses another
    if (bodyUploadType && bodyUploadType !== middlewareUploadType) {
      return res.status(400).json({ 
        error: `Upload type mismatch: middleware was configured for "${middlewareUploadType}" (from query.type="${queryUploadType || 'default'}"), but body.uploadType="${bodyUploadType}". These must match to ensure correct middleware configuration.` 
      });
    }
    
    // Use body param if provided (takes priority for backward compatibility), otherwise fall back to query param
    // Since we validated above that body.uploadType matches middleware type, this is safe
    const uploadType = bodyUploadType || queryUploadType || 'program';
    
    // Handle S3 uploads for post-act reports
    if (uploadType === 'program_post_act') {
      try {
        const { uploadSingleToS3 } = await import('../../utils/s3Upload.js');
        
        // Upload to S3 (multer middleware above only parsed the file into memory)
        const uploadResult = await uploadSingleToS3(
          req.file,
          S3_FOLDERS.PROGRAMS.POST_ACT,
          { prefix: 'post_act_' }
        );
        
        res.json({
          success: true,
          filename: req.file.originalname,
          filePath: uploadResult.public_id,
          url: uploadResult.url,
          public_id: uploadResult.public_id
        });
      } catch (uploadError) {
        res.status(500).json({ error: 'Failed to upload file to S3: ' + uploadError.message });
      }
      return;
    }
    
    // Use appropriate folder and prefix based on upload type (Cloudinary)
    let folder;
    let prefix;
    
    switch (uploadType) {
      case 'organization-logo':
        folder = 'faith-community/organizations/logos';
        prefix = 'org_logo_';
        break;
      case 'organization-head':
        folder = 'faith-community/organizations/heads';
        prefix = 'org_head_';
        break;
      case 'heads-faces':
        // Note: heads-faces uploads should use the dedicated endpoint: /api/superadmin/heads-faces/upload-image
        folder = 'faith-community/organizations/heads';
        prefix = 'heads_faces_';
        break;
      case 'highlight':
        folder = CLOUDINARY_FOLDERS.HIGHLIGHTS;
        prefix = 'highlight_';
        break;
      case 'program_additional':
        folder = CLOUDINARY_FOLDERS.PROGRAMS.ADDITIONAL;
        prefix = 'prog_addl_';
        break;
      default:
        folder = 'faith-community/programs/main';
        prefix = 'prog_main_';
        break;
    }
    
    try {
      const { uploadSingleToCloudinary } = await import('../../utils/cloudinaryUpload.js');
      
      // Upload to Cloudinary
      const uploadResult = await uploadSingleToCloudinary(
        req.file, 
        folder,
        { prefix }
      );
      
      
      res.json({ 
        success: true,
        filename: req.file.originalname,
        filePath: uploadResult.public_id, // Use public_id for frontend compatibility
        url: uploadResult.url,
        cloudinary_info: {
          public_id: uploadResult.public_id,
          format: uploadResult.format,
          width: uploadResult.width,
          height: uploadResult.height,
          size: uploadResult.size
        }
      });
    } catch (uploadError) {
      res.status(500).json({ error: 'Failed to upload file to Cloudinary: ' + uploadError.message });
    }
  } catch (error) {
    next(error); // Pass error to error handling middleware
  }
});

// Error handling middleware for multer errors
router.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      // Determine upload type to provide accurate error message
      const uploadType = req.query.type || req.body?.uploadType || 'program';
      const maxSize = uploadType === 'highlight' ? '100MB' : '5MB';
      return res.status(400).json({ error: `File too large. Maximum size is ${maxSize}.` });
    }
    if (error.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({ error: 'Too many files. Only one file allowed.' });
    }
    return res.status(400).json({ error: 'File upload error: ' + error.message });
  }
  
  if (error) {
    return res.status(500).json({ error: 'Upload failed: ' + error.message });
  }
  
  next();
});

// Public upload route for organization logos (no authentication required)
router.post('/public/organization-logo', cloudinaryUploadConfigs.organizationLogo.single('logo'), async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ 
        success: false, 
        error: 'No file uploaded' 
      });
    }
    
    try {
      const { uploadSingleToCloudinary } = await import('../../utils/cloudinaryUpload.js');
      
      // Upload to Cloudinary
      const uploadResult = await uploadSingleToCloudinary(
        req.file, 
        CLOUDINARY_FOLDERS.ORGANIZATIONS.LOGOS,
        { prefix: 'org_logo_' }
      );
      
      res.json({
        success: true,
        filename: req.file.originalname,
        logoPath: uploadResult.public_id, // Return public_id for database storage
        url: uploadResult.url,
        cloudinary_info: {
          public_id: uploadResult.public_id,
          format: uploadResult.format,
          width: uploadResult.width,
          height: uploadResult.height,
          size: uploadResult.size
        }
      });
    } catch (uploadError) {
      res.status(500).json({ 
        success: false, 
        error: 'Failed to upload file to Cloudinary: ' + uploadError.message 
      });
    }
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: 'Upload failed: ' + error.message 
    });
  }
});

// Error handling middleware for public upload multer errors
router.use('/public', (error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ 
        success: false, 
        error: 'File too large. Maximum size is 5MB.' 
      });
    }
    return res.status(400).json({ 
      success: false, 
      error: 'File upload error: ' + error.message 
    });
  }
  
  if (error) {
    return res.status(500).json({ 
      success: false,
      error: 'Upload failed: ' + error.message 
    });
  }
  
  next();
});

export default router;