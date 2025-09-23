//upload handler: uploadController.js

import express from 'express';
import { cloudinaryUploadConfigs } from '../../utils/cloudinaryUpload.js';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import jwt from 'jsonwebtoken';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || "change-me-in-env";

// Authentication middleware for upload routes
const authenticateAdmin = (req, res, next) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Access token required' });
  }
  
  const token = authHeader.substring(7);
  
  try {
    const decoded = jwt.verify(token, JWT_SECRET, {
      issuer: process.env.JWT_ISS || "faith-community",
      audience: process.env.JWT_AUD || "admin",
    });
    req.admin = decoded;
    next();
  } catch (err) {
    console.error('JWT verification error:', err);
    return res.status(403).json({ error: 'Invalid or expired token' });
  }
};

// Using Cloudinary for file storage - no local uploads directory needed

// Generic upload handler that processes any file type
router.post('/', authenticateAdmin, cloudinaryUploadConfigs.programMain.single('file'), async (req, res, next) => {
  console.log('🔄 Upload route hit');
  console.log('📁 Request body:', req.body);
  console.log('📎 Request headers:', req.headers);
  
  try {
    if (!req.file) {
      console.error('❌ No file in request');
      return res.status(400).json({ error: 'No file uploaded' });
    }
    
    // Determine upload type from request body or query params
    const uploadType = req.body.uploadType || req.query.type || 'program';
    console.log('📝 Upload type:', uploadType);
    
    // Use appropriate folder and prefix based on upload type
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
      default:
        folder = 'faith-community/programs/main';
        prefix = 'prog_main_';
        break;
    }
    
    try {
      const { CLOUDINARY_FOLDERS } = await import('../../utils/cloudinaryConfig.js');
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
      console.error('❌ Cloudinary upload error:', uploadError);
      res.status(500).json({ error: 'Failed to upload file to Cloudinary: ' + uploadError.message });
    }
  } catch (error) {
    console.error('❌ File upload error:', error);
    next(error); // Pass error to error handling middleware
  }
});

// Error handling middleware for multer errors
router.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    console.error('❌ Multer error:', error);
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'File too large. Maximum size is 5MB.' });
    }
    if (error.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({ error: 'Too many files. Only one file allowed.' });
    }
    return res.status(400).json({ error: 'File upload error: ' + error.message });
  }
  
  if (error) {
    console.error('❌ Upload route error:', error);
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
      const { CLOUDINARY_FOLDERS } = await import('../../utils/cloudinaryConfig.js');
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
      console.error('❌ Cloudinary upload error:', uploadError);
      res.status(500).json({ 
        success: false, 
        error: 'Failed to upload file to Cloudinary: ' + uploadError.message 
      });
    }
  } catch (error) {
    console.error('Public upload error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Upload failed: ' + error.message 
    });
  }
});

// Error handling middleware for public upload multer errors
router.use('/public', (error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    console.error('Public upload Multer error:', error);
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
    console.error('Public upload route error:', error);
    return res.status(500).json({ 
      success: false, 
      error: 'Upload failed: ' + error.message 
    });
  }
  
  next();
});

export default router; 