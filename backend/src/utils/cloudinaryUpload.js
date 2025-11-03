import multer from 'multer';
import { 
  uploadBufferToCloudinary, 
  CLOUDINARY_FOLDERS,
  generateCloudinaryUrl 
} from './cloudinaryConfig.js';

// Memory storage for multer (to work with Cloudinary)
const storage = multer.memoryStorage();

// File filter for images
const imageFileFilter = (req, file, cb) => {
  const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/gif", "image/webp", "image/svg+xml", "image/avif"];
  
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Only JPEG, PNG, GIF, WebP, AVIF, and SVG images are allowed"), false);
  }
};

// File filter for documents (PDF, images)
const documentFileFilter = (req, file, cb) => {
  const allowedTypes = [
    "image/jpeg", "image/jpg", "image/png", 
    "application/pdf"
  ];
  
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Only JPEG, PNG, and PDF files are allowed"), false);
  }
};

// Generate unique filename for Cloudinary
const generateUniqueFilename = (originalname, prefix = '') => {
  const timestamp = Date.now();
  const randomSuffix = Math.round(Math.random() * 1e9);
  const extension = originalname.split('.').pop();
  const baseName = originalname.replace(/\.[^/.]+$/, "");
  const sanitizedBaseName = baseName.replace(/[^a-zA-Z0-9]/g, "_");
  
  return `${prefix}${sanitizedBaseName}_${timestamp}_${randomSuffix}`;
};

// Create multer configuration for Cloudinary uploads
const createCloudinaryUploadConfig = (folder, options = {}) => {
  const {
    fileFilter = imageFileFilter,
    fileSize = 5 * 1024 * 1024, // 5MB default
    files = 1,
    prefix = ''
  } = options;

  return multer({
    storage,
    fileFilter,
    limits: {
      fileSize,
      files
    },
  });
};

// Upload single file to Cloudinary
export const uploadSingleToCloudinary = async (file, folder, options = {}) => {
  if (!file) {
    throw new Error('No file provided');
  }

  const publicId = generateUniqueFilename(file.originalname, options.prefix || '');
  
  const uploadOptions = {
    folder,
    public_id: publicId,
    transformation: options.transformation,
    ...options
  };

  try {
    const result = await uploadBufferToCloudinary(file.buffer, uploadOptions);
    return {
      success: true,
      url: result.secure_url,
      public_id: result.public_id,
      original_filename: file.originalname,
      size: file.size,
      format: result.format,
      width: result.width || null,
      height: result.height || null,
      resource_type: result.resource_type
    };
  } catch (error) {
    console.error('Error uploading to Cloudinary:', error);
    throw new Error(`Failed to upload file: ${error.message}`);
  }
};

// Upload multiple files to Cloudinary
export const uploadMultipleToCloudinary = async (files, folder, options = {}) => {
  if (!files || files.length === 0) {
    throw new Error('No files provided');
  }

  const uploadPromises = files.map(file => 
    uploadSingleToCloudinary(file, folder, options)
  );

  try {
    const results = await Promise.all(uploadPromises);
    return {
      success: true,
      files: results,
      count: results.length
    };
  } catch (error) {
    console.error('Error uploading multiple files to Cloudinary:', error);
    throw new Error(`Failed to upload files: ${error.message}`);
  }
};

// Predefined upload configurations for different types
export const cloudinaryUploadConfigs = {
  // Branding uploads
  branding: createCloudinaryUploadConfig(CLOUDINARY_FOLDERS.BRANDING, { 
    prefix: 'branding_',
    fileSize: 2 * 1024 * 1024 // 2MB for branding files
  }),
  
  // User profile uploads
  userProfile: createCloudinaryUploadConfig(CLOUDINARY_FOLDERS.USER_PROFILES, { 
    prefix: 'profile_',
    fileSize: 3 * 1024 * 1024 // 3MB for profile photos
  }),
  
  // News uploads
  news: createCloudinaryUploadConfig(CLOUDINARY_FOLDERS.NEWS, { 
    prefix: 'news_',
    fileSize: 5 * 1024 * 1024 // 5MB for news images
  }),
  
  // Organization uploads
  organizationLogo: createCloudinaryUploadConfig(CLOUDINARY_FOLDERS.ORGANIZATIONS.LOGOS, { 
    prefix: 'org_logo_',
    fileSize: 2 * 1024 * 1024 // 2MB for logos
  }),
  
  organizationHead: createCloudinaryUploadConfig(CLOUDINARY_FOLDERS.ORGANIZATIONS.HEADS, { 
    prefix: 'org_head_',
    fileSize: 3 * 1024 * 1024 // 3MB for head photos
  }),
  
  // Program uploads
  programMain: createCloudinaryUploadConfig(CLOUDINARY_FOLDERS.PROGRAMS.MAIN, { 
    prefix: 'prog_main_',
    fileSize: 5 * 1024 * 1024 // 5MB for main program images
  }),
  
  programAdditional: createCloudinaryUploadConfig(CLOUDINARY_FOLDERS.PROGRAMS.ADDITIONAL, { 
    prefix: 'prog_add_',
    files: 10, // Allow up to 10 additional images
    fileSize: 5 * 1024 * 1024 // 5MB for additional images
  })
};

// Helper function to get optimized image URL
export const getOptimizedImageUrl = (publicId, options = {}) => {
  return generateCloudinaryUrl(publicId, {
    width: options.width,
    height: options.height,
    crop: options.crop || 'fill',
    quality: options.quality || 'auto',
    format: options.format || 'auto',
    gravity: options.gravity || 'auto'
  });
};

// Helper function to get thumbnail URL
export const getThumbnailUrl = (publicId, size = 150) => {
  return generateCloudinaryUrl(publicId, {
    width: size,
    height: size,
    crop: 'fill',
    quality: 'auto',
    format: 'auto'
  });
};

export default cloudinaryUploadConfigs;
