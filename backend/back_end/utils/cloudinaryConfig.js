import { v2 as cloudinary } from 'cloudinary';
import streamifier from 'streamifier';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true
});

// Test Cloudinary connection
export const testCloudinaryConnection = async () => {
  try {
    const result = await cloudinary.api.ping();
    console.log('✅ Cloudinary connection successful:', result);
    return true;
  } catch (error) {
    console.error('❌ Cloudinary connection failed:', error);
    return false;
  }
};

// Upload buffer to Cloudinary
export const uploadBufferToCloudinary = (buffer, options = {}) => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        resource_type: 'auto',
        folder: options.folder || 'faith-community',
        public_id: options.public_id,
        transformation: options.transformation,
        ...options
      },
      (error, result) => {
        if (error) {
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
  return cloudinary.uploader.upload(filePath, {
    resource_type: 'auto',
    folder: options.folder || 'faith-community',
    public_id: options.public_id,
    transformation: options.transformation,
    ...options
  });
};

// Delete file from Cloudinary
export const deleteFromCloudinary = async (publicId, options = {}) => {
  try {
    const result = await cloudinary.uploader.destroy(publicId, {
      resource_type: options.resource_type || 'image',
      ...options
    });
    return result;
  } catch (error) {
    console.error('Error deleting from Cloudinary:', error);
    throw error;
  }
};

// Extract public ID from Cloudinary URL
export const extractPublicIdFromUrl = (url) => {
  if (!url) return null;
  
  // Handle different Cloudinary URL formats
  const patterns = [
    /\/v\d+\/(.+?)\.(jpg|jpeg|png|gif|webp|svg|ico)$/i,
    /\/image\/upload\/v\d+\/(.+?)\.(jpg|jpeg|png|gif|webp|svg|ico)$/i,
    /\/image\/upload\/(.+?)\.(jpg|jpeg|png|gif|webp|svg|ico)$/i
  ];
  
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) {
      return match[1];
    }
  }
  
  return null;
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
