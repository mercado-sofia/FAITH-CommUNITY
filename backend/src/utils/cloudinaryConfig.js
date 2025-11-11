import { v2 as cloudinary } from 'cloudinary';
import streamifier from 'streamifier';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Check if Cloudinary is configured
export const isCloudinaryConfigured = () => {
  return !!(
    process.env.CLOUDINARY_CLOUD_NAME?.trim() &&
    process.env.CLOUDINARY_API_KEY?.trim() &&
    process.env.CLOUDINARY_API_SECRET?.trim()
  );
};

// Get Cloudinary configuration status
export const getCloudinaryStatus = () => {
  const configured = isCloudinaryConfigured();
  const missing = [];
  
  if (!process.env.CLOUDINARY_CLOUD_NAME?.trim()) missing.push('CLOUDINARY_CLOUD_NAME');
  if (!process.env.CLOUDINARY_API_KEY?.trim()) missing.push('CLOUDINARY_API_KEY');
  if (!process.env.CLOUDINARY_API_SECRET?.trim()) missing.push('CLOUDINARY_API_SECRET');
  
  return {
    configured,
    missing,
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME?.trim() || 'not set',
    api_key: process.env.CLOUDINARY_API_KEY?.trim() ? '***' + process.env.CLOUDINARY_API_KEY.slice(-4) : 'not set',
  };
};

// Configure Cloudinary (only if credentials are available)
if (isCloudinaryConfigured()) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME?.trim(),
    api_key: process.env.CLOUDINARY_API_KEY?.trim(),
    api_secret: process.env.CLOUDINARY_API_SECRET?.trim(),
    secure: true
  });
} else {
  console.warn('⚠️  Cloudinary not configured. Missing:', getCloudinaryStatus().missing.join(', '));
  console.warn('   → File upload features will not work until Cloudinary is configured');
}

// Test Cloudinary connection
export const testCloudinaryConnection = async () => {
  if (!isCloudinaryConfigured()) {
    const status = getCloudinaryStatus();
    console.error('Cloudinary not configured. Missing:', status.missing.join(', '));
    return false;
  }

  // Reconfigure if needed
  if (!cloudinary.config().api_key) {
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME?.trim(),
      api_key: process.env.CLOUDINARY_API_KEY?.trim(),
      api_secret: process.env.CLOUDINARY_API_SECRET?.trim(),
      secure: true
    });
  }

  try {
    const result = await cloudinary.api.ping();
    return true;
  } catch (error) {
    console.error('Cloudinary connection failed:', error);
    return false;
  }
};

// Upload buffer to Cloudinary
export const uploadBufferToCloudinary = (buffer, options = {}) => {
  // Check if Cloudinary is configured
  if (!isCloudinaryConfigured()) {
    const status = getCloudinaryStatus();
    const error = new Error(`Cloudinary not configured. Missing: ${status.missing.join(', ')}`);
    error.code = 'CLOUDINARY_NOT_CONFIGURED';
    error.status = status;
    return Promise.reject(error);
  }

  // Reconfigure if needed (in case env vars were loaded after module initialization)
  if (!cloudinary.config().api_key) {
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME?.trim(),
      api_key: process.env.CLOUDINARY_API_KEY?.trim(),
      api_secret: process.env.CLOUDINARY_API_SECRET?.trim(),
      secure: true
    });
  }

  return new Promise((resolve, reject) => {
    // Use provided resource_type or default to 'auto'
    // 'auto' detects image/video/raw automatically
    // 'raw' should be used explicitly for PDFs and documents
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        resource_type: options.resource_type || 'auto',
        folder: options.folder || 'faith-community',
        public_id: options.public_id,
        transformation: options.transformation,
        ...options
      },
      (error, result) => {
        if (error) {
          console.error('Error uploading to Cloudinary:', error);
          reject(error);
        } else {
          resolve(result);
        }
      }
    );

    streamifier.createReadStream(buffer).pipe(uploadStream);
  });
};

// Upload file from path to Cloudinary
export const uploadFileToCloudinary = (filePath, options = {}) => {
  // Check if Cloudinary is configured
  if (!isCloudinaryConfigured()) {
    const status = getCloudinaryStatus();
    const error = new Error(`Cloudinary not configured. Missing: ${status.missing.join(', ')}`);
    error.code = 'CLOUDINARY_NOT_CONFIGURED';
    error.status = status;
    return Promise.reject(error);
  }

  // Reconfigure if needed
  if (!cloudinary.config().api_key) {
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME?.trim(),
      api_key: process.env.CLOUDINARY_API_KEY?.trim(),
      api_secret: process.env.CLOUDINARY_API_SECRET?.trim(),
      secure: true
    });
  }

  return cloudinary.uploader.upload(filePath, {
    resource_type: 'auto',
    folder: options.folder || 'faith-community',
    public_id: options.public_id,
    transformation: options.transformation,
    ...options
  });
};

// Delete file from Cloudinary
// If resource_type is not provided, try both 'image' and 'raw'
export const deleteFromCloudinary = async (publicId, options = {}) => {
  // Check if Cloudinary is configured
  if (!isCloudinaryConfigured()) {
    const status = getCloudinaryStatus();
    const error = new Error(`Cloudinary not configured. Missing: ${status.missing.join(', ')}`);
    error.code = 'CLOUDINARY_NOT_CONFIGURED';
    error.status = status;
    throw error;
  }

  // Reconfigure if needed
  if (!cloudinary.config().api_key) {
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME?.trim(),
      api_key: process.env.CLOUDINARY_API_KEY?.trim(),
      api_secret: process.env.CLOUDINARY_API_SECRET?.trim(),
      secure: true
    });
  }

  try {
    // If resource_type is explicitly provided, use it
    if (options.resource_type) {
      const result = await cloudinary.uploader.destroy(publicId, {
        resource_type: options.resource_type,
        ...options
      });
      return result;
    }
    
    // If resource_type not provided and URL is available, determine from URL
    if (options.url) {
      const resourceType = getResourceTypeFromUrl(options.url);
      const result = await cloudinary.uploader.destroy(publicId, {
        resource_type: resourceType,
        ...options
      });
      return result;
    }
    
    // Try 'image' first (default), then 'raw' if it fails
    try {
      const result = await cloudinary.uploader.destroy(publicId, {
        resource_type: 'image',
        ...options
      });
      return result;
    } catch (imageError) {
      // If image delete fails, try raw
      try {
        const result = await cloudinary.uploader.destroy(publicId, {
          resource_type: 'raw',
          ...options
        });
        return result;
      } catch (rawError) {
        // If both fail, throw the original error
        throw imageError;
      }
    }
  } catch (error) {
    console.error('Error deleting from Cloudinary:', error);
    throw error;
  }
};

// Extract public ID from Cloudinary URL and determine resource type
export const extractPublicIdFromUrl = (url) => {
  if (!url) return null;
  
  // Handle different Cloudinary URL formats for images
  const imagePatterns = [
    /\/v\d+\/(.+?)\.(jpg|jpeg|png|gif|webp|svg|ico|heic)$/i,
    /\/image\/upload\/v\d+\/(.+?)\.(jpg|jpeg|png|gif|webp|svg|ico|heic)$/i,
    /\/image\/upload\/(.+?)\.(jpg|jpeg|png|gif|webp|svg|ico|heic)$/i
  ];
  
  // Handle raw file URLs (PDFs, DOC, DOCX, etc.)
  const rawPatterns = [
    /\/raw\/upload\/v\d+\/(.+?)$/i,
    /\/raw\/upload\/(.+?)$/i,
    /\/v\d+\/(.+?)\.(pdf|doc|docx|zip|txt)$/i
  ];
  
  // Try image patterns first
  for (const pattern of imagePatterns) {
    const match = url.match(pattern);
    if (match) {
      return match[1];
    }
  }
  
  // Try raw patterns
  for (const pattern of rawPatterns) {
    const match = url.match(pattern);
    if (match) {
      return match[1];
    }
  }
  
  return null;
};

// Determine resource type from Cloudinary URL
export const getResourceTypeFromUrl = (url) => {
  if (!url) return 'image'; // default
  
  // Check for raw file URLs
  if (url.includes('/raw/upload')) {
    return 'raw';
  }
  
  // Check for image URLs
  if (url.includes('/image/upload')) {
    return 'image';
  }
  
  // Default to image if cannot determine
  return 'image';
};

// Generate Cloudinary URL with transformations
export const generateCloudinaryUrl = (publicId, options = {}) => {
  if (!publicId) return null;
  
  const {
    width,
    height,
    crop = 'fill',
    quality = 'auto',
    format = 'auto',
    gravity = 'auto'
  } = options;
  
  const transformation = [];
  
  if (width || height) {
    transformation.push(`w_${width || 'auto'}`);
    transformation.push(`h_${height || 'auto'}`);
    transformation.push(`c_${crop}`);
    if (gravity !== 'auto') transformation.push(`g_${gravity}`);
  }
  
  transformation.push(`q_${quality}`);
  transformation.push(`f_${format}`);
  
  const transformString = transformation.join(',');
  
  return cloudinary.url(publicId, {
    secure: true,
    transformation: transformString ? [{ [transformString]: true }] : undefined
  });
};

// Folder configurations for different upload types
export const CLOUDINARY_FOLDERS = {
  BRANDING: 'faith-community/branding',
  USER_PROFILES: 'faith-community/user-profiles',
  NEWS: 'faith-community/news',
  HIGHLIGHTS: 'faith-community/highlights',
  ORGANIZATIONS: {
    LOGOS: 'faith-community/organizations/logos',
    HEADS: 'faith-community/organizations/heads'
  },
  PROGRAMS: {
    MAIN: 'faith-community/programs/main',
    ADDITIONAL: 'faith-community/programs/additional',
    THUMBNAILS: 'faith-community/programs/thumbnails'
  }
};

export default cloudinary;
