import express from 'express';
import upload from '../middleware/upload.js';
import fs from 'fs';
import path from 'path';

const router = express.Router();

// Ensure uploads directory exists
const uploadsDir = 'uploads';
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

router.post('/', upload.single('file'), (req, res) => {
  console.log('🔄 Upload route hit');
  console.log('📁 Request body:', req.body);
  console.log('📎 Request file:', req.file);
  
  try {
    if (!req.file) {
      console.error('❌ No file in request');
      return res.status(400).json({ error: 'No file uploaded' });
    }
    
    // Return the URL that the frontend expects
    const fileUrl = `http://localhost:8080/uploads/${req.file.filename}`;
    
    console.log('✅ File uploaded successfully:', {
      originalname: req.file.originalname,
      filename: req.file.filename,
      size: req.file.size,
      mimetype: req.file.mimetype,
      destination: req.file.destination,
      path: req.file.path,
      url: fileUrl
    });
    
    // Check if file actually exists on disk
    if (fs.existsSync(req.file.path)) {
      console.log('✅ File exists on disk at:', req.file.path);
    } else {
      console.error('❌ File does NOT exist on disk at:', req.file.path);
    }
    
    res.json({ 
      success: true,
      filename: req.file.filename,
      url: fileUrl
    });
  } catch (error) {
    console.error('❌ File upload error:', error);
    res.status(500).json({ error: 'File upload failed', details: error.message });
  }
});

export default router; 