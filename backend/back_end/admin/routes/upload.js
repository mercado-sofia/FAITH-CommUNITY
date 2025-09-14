//upload handler: uploadController.js

import express from 'express';
import upload from '../middleware/upload.js';
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

// Ensure uploads directory exists
const uploadsDir = path.resolve('uploads');
console.log('📁 Uploads directory (absolute):', uploadsDir);
if (!fs.existsSync(uploadsDir)) {
  console.log('📁 Creating uploads directory:', uploadsDir);
  fs.mkdirSync(uploadsDir, { recursive: true });
} else {
  console.log('📁 Uploads directory already exists:', uploadsDir);
}

router.post('/', authenticateAdmin, upload.single('file'), (req, res, next) => {
  console.log('🔄 Upload route hit');
  console.log('📁 Request body:', req.body);
  console.log('📎 Request file:', req.file);
  console.log('📎 Request headers:', req.headers);
  
  try {
    if (!req.file) {
      console.error('❌ No file in request');
      return res.status(400).json({ error: 'No file uploaded' });
    }
    
    // Validate file exists
    if (!fs.existsSync(req.file.path)) {
      console.error('❌ Uploaded file does not exist:', req.file.path);
      return res.status(500).json({ error: 'Uploaded file not found' });
    }
    
    // Check file permissions
    try {
      fs.accessSync(req.file.path, fs.constants.R_OK);
      console.log('✅ Source file is readable');
    } catch (accessError) {
      console.error('❌ Source file is not readable:', accessError);
      return res.status(500).json({ error: 'Uploaded file is not readable' });
    }
    
         // Determine upload type from request body or query params
     const uploadType = req.body.uploadType || req.query.type || 'program';
     console.log('📝 Upload type:', uploadType);
     let fileUrl;
     let targetPath; // Declare targetPath at function scope
    
    if (uploadType === 'organization-logo') {
             // Move file to organizations/logos directory
       const targetDir = path.join(uploadsDir, 'organizations', 'logos');
       targetPath = path.join(targetDir, req.file.filename);
      
      // Ensure target directory exists
      if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
      }
      
      // Move file to correct location
      try {
        fs.renameSync(req.file.path, targetPath);
        console.log('✅ File moved successfully:', { from: req.file.path, to: targetPath });
      } catch (moveError) {
        console.error('❌ Failed to move file:', moveError);
        return res.status(500).json({ error: 'Failed to save uploaded file' });
      }
      fileUrl = `/uploads/organizations/logos/${req.file.filename}`;
    } else if (uploadType === 'organization-head') {
      console.log('📁 Processing organization-head upload');
             // Move file to organizations/heads directory
       const targetDir = path.join(uploadsDir, 'organizations', 'heads');
       targetPath = path.join(targetDir, req.file.filename);
      
      console.log('📁 Target directory:', targetDir);
      console.log('📁 Target path:', targetPath);
      
      // Ensure target directory exists
      if (!fs.existsSync(targetDir)) {
        console.log('📁 Creating target directory:', targetDir);
        try {
          fs.mkdirSync(targetDir, { recursive: true });
          console.log('✅ Target directory created successfully');
        } catch (mkdirError) {
          console.error('❌ Failed to create target directory:', mkdirError);
          return res.status(500).json({ error: 'Failed to create upload directory: ' + mkdirError.message });
        }
      } else {
        console.log('📁 Target directory already exists');
      }
      
      // Check if target directory is writable
      try {
        fs.accessSync(targetDir, fs.constants.W_OK);
        console.log('✅ Target directory is writable');
      } catch (accessError) {
        console.error('❌ Target directory is not writable:', accessError);
        return res.status(500).json({ error: 'Upload directory is not writable' });
      }
      
      // Move file to correct location
      try {
        console.log('📁 Moving file from:', req.file.path, 'to:', targetPath);
        fs.renameSync(req.file.path, targetPath);
        console.log('✅ File moved successfully:', { from: req.file.path, to: targetPath });
      } catch (moveError) {
        console.error('❌ Failed to move file:', moveError);
        return res.status(500).json({ error: 'Failed to save uploaded file: ' + moveError.message });
      }
      fileUrl = `/uploads/organizations/heads/${req.file.filename}`;
    } else {
             // Default: programs/main-images
       const targetDir = path.join(uploadsDir, 'programs', 'main-images');
       targetPath = path.join(targetDir, req.file.filename);
      
      // Ensure target directory exists
      if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
      }
      
      // Move file to correct location
      try {
        fs.renameSync(req.file.path, targetPath);
        console.log('✅ File moved successfully:', { from: req.file.path, to: targetPath });
      } catch (moveError) {
        console.error('❌ Failed to move file:', moveError);
        return res.status(500).json({ error: 'Failed to save uploaded file' });
      }
      fileUrl = `/uploads/programs/main-images/${req.file.filename}`;
    }
    
    console.log('✅ File uploaded successfully:', {
      originalname: req.file.originalname,
      filename: req.file.filename,
      size: req.file.size,
      mimetype: req.file.mimetype,
      uploadType: uploadType,
      url: fileUrl,
      targetPath: targetPath
    });
    
    res.json({ 
      success: true,
      filename: req.file.filename,
      filePath: req.file.filename, // Add this for frontend compatibility
      url: fileUrl
    });
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
// Create a separate multer instance for public uploads
const publicUpload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      const targetDir = path.join(uploadsDir, 'organizations', 'logos');
      if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
      }
      cb(null, targetDir);
    },
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      const extension = path.extname(file.originalname);
      const baseName = path.basename(file.originalname, extension);
      const sanitizedBaseName = baseName.replace(/[^a-zA-Z0-9]/g, "_");
      cb(null, `org_logo_${sanitizedBaseName}-${uniqueSuffix}${extension}`);
    }
  }),
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'), false);
    }
  }
});

router.post('/public/organization-logo', publicUpload.single('logo'), (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ 
        success: false, 
        error: 'No file uploaded' 
      });
    }
    
    // File is already in the correct location due to multer configuration
    const fileUrl = `/uploads/organizations/logos/${req.file.filename}`;
    
    res.json({
      success: true,
      filename: req.file.filename,
      logoPath: req.file.filename, // Return just the filename for database storage
      url: fileUrl
    });
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