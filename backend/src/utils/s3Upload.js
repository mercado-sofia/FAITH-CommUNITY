import multer from 'multer';
import { 
  s3Client,
  S3_BUCKET_NAME,
  getS3Url,
  S3_FOLDERS
} from './s3Config.js';
import { Upload } from '@aws-sdk/lib-storage';
import { DeleteObjectCommand, S3Client } from '@aws-sdk/client-s3';

// Memory storage for multer (to work with S3)
const storage = multer.memoryStorage();

// File filter for images
export const imageFileFilter = (req, file, cb) => {
  const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/gif", "image/webp", "image/svg+xml", "image/avif"];
  
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Only JPEG, PNG, GIF, WebP, AVIF, and SVG images are allowed"), false);
  }
};

// File filter for documents (PDF, DOC, DOCX, images)
export const documentFileFilter = (req, file, cb) => {
  const allowedTypes = [
    "image/jpeg", "image/jpg", "image/png", "image/webp", "image/heic",
    "application/pdf",
    "application/msword", // .doc
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document" // .docx
  ];
  
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Only JPEG, PNG, WEBP, HEIC, PDF, DOC, and DOCX files are allowed"), false);
  }
};

// Generate unique filename for S3
const generateUniqueFilename = (originalname, prefix = '') => {
  const timestamp = Date.now();
  const randomSuffix = Math.round(Math.random() * 1e9);
  const extension = originalname.split('.').pop();
  const baseName = originalname.replace(/\.[^/.]+$/, "");
  const sanitizedBaseName = baseName.replace(/[^a-zA-Z0-9]/g, "_");
  
  return `${prefix}${sanitizedBaseName}_${timestamp}_${randomSuffix}.${extension}`;
};

// Determine content type from mimetype
const getContentType = (mimetype, filename) => {
  if (mimetype) return mimetype;
  
  const ext = filename.split('.').pop().toLowerCase();
  const contentTypes = {
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'png': 'image/png',
    'gif': 'image/gif',
    'webp': 'image/webp',
    'pdf': 'application/pdf',
    'doc': 'application/msword',
    'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'mp4': 'video/mp4',
    'mov': 'video/quicktime',
  };
  
  return contentTypes[ext] || 'application/octet-stream';
};

// Upload single file to S3
export const uploadSingleToS3 = async (file, folder, options = {}) => {
  if (!file) {
    throw new Error('No file provided');
  }

  const filename = generateUniqueFilename(file.originalname, options.prefix || '');
  const key = `${folder}/${filename}`;
  const contentType = getContentType(file.mimetype, file.originalname);

  // Import s3Client dynamically to get the latest instance
  const { s3Client } = await import('./s3Config.js');

  try {
    const upload = new Upload({
      client: s3Client,
      params: {
        Bucket: S3_BUCKET_NAME,
        Key: key,
        Body: file.buffer,
        ContentType: contentType,
        // ACL removed - bucket uses bucket policy for public access (ACLs disabled)
        CacheControl: 'max-age=31536000', // Cache for 1 year
      },
    });

    const result = await upload.done();
    const url = getS3Url(key);

    return {
      success: true,
      url: url,
      key: key,
      public_id: key, // For compatibility with existing code that uses public_id
      original_filename: file.originalname,
      size: file.size,
      format: file.originalname.split('.').pop(),
      content_type: contentType,
    };
  } catch (error) {
    // Handle region redirect error - detect and retry with correct region
    if (error.name === 'PermanentRedirect' && error.$response?.headers?.['x-amz-bucket-region']) {
      const correctRegion = error.$response.headers['x-amz-bucket-region'];
      
      // Create new S3 client with correct region
      const correctedS3Client = new S3Client({
        region: correctRegion,
        credentials: {
          accessKeyId: process.env.AWS_ACCESS_KEY_ID,
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
        },
      });

      try {
        const retryUpload = new Upload({
          client: correctedS3Client,
          params: {
            Bucket: S3_BUCKET_NAME,
            Key: key,
            Body: file.buffer,
            ContentType: contentType,
            // ACL removed - bucket uses bucket policy for public access (ACLs disabled)
            CacheControl: 'max-age=31536000',
          },
        });

        const result = await retryUpload.done();
        
        // Update the URL to use correct region
        const { getS3Url } = await import('./s3Config.js');
        const url = getS3Url(key);

        return {
          success: true,
          url: url,
          key: key,
          public_id: key,
          original_filename: file.originalname,
          size: file.size,
          format: file.originalname.split('.').pop(),
          content_type: contentType,
        };
      } catch (retryError) {
        console.error('Error uploading to S3 (retry failed):', retryError);
        throw new Error(`Failed to upload file: ${retryError.message}`);
      }
    }
    
    console.error('Error uploading to S3:', error);
    throw new Error(`Failed to upload file: ${error.message}`);
  }
};

// Upload multiple files to S3
export const uploadMultipleToS3 = async (files, folder, options = {}) => {
  if (!files || files.length === 0) {
    throw new Error('No files provided');
  }

  try {
    const uploadPromises = files.map(file => 
      uploadSingleToS3(file, folder, options)
    );
    const results = await Promise.all(uploadPromises);
    return {
      success: true,
      files: results,
      count: results.length
    };
  } catch (error) {
    console.error('Error uploading multiple files to S3:', error);
    throw error;
  }
};

// Delete file from S3
export const deleteFromS3 = async (key) => {
  try {
    const command = new DeleteObjectCommand({
      Bucket: S3_BUCKET_NAME,
      Key: key,
    });
    
    await s3Client.send(command);
    return { success: true };
  } catch (error) {
    console.error('Error deleting from S3:', error);
    throw error;
  }
};

// Extract key from S3 URL
export const extractKeyFromUrl = (url) => {
  if (!url) return null;
  
  try {
    // CloudFront URL: https://xxxxx.cloudfront.net/path/to/file
    if (url.includes('cloudfront.net')) {
      return url.split('.cloudfront.net/')[1]?.split('?')[0];
    }
    
    // S3 URL: https://bucket.s3.region.amazonaws.com/path/to/file
    if (url.includes('amazonaws.com')) {
      const parts = url.split('.amazonaws.com/');
      return parts[1]?.split('?')[0]; // Remove query params
    }
    
    // If already a key (no http/https)
    if (!url.startsWith('http')) {
      return url;
    }
    
    return null;
  } catch {
    return null;
  }
};

// Create multer configuration for S3 uploads
export const createS3UploadConfig = (folder, options = {}) => {
  const {
    fileFilter = imageFileFilter,
    fileSize = 5 * 1024 * 1024, // 5MB default
    files = 1,
    prefix = ''
  } = options;

  return multer({
    storage: storage,
    fileFilter,
    limits: {
      fileSize,
      files
    },
  });
};

// Pre-configured upload configs
export const s3UploadConfigs = {
  branding: createS3UploadConfig(S3_FOLDERS.BRANDING, { 
    prefix: 'branding_',
    fileSize: 2 * 1024 * 1024 // 2MB for branding files
  }),
  userProfile: createS3UploadConfig(S3_FOLDERS.USER_PROFILES, { 
    prefix: 'profile_',
    fileSize: 3 * 1024 * 1024 // 3MB for profile photos
  }),
  news: createS3UploadConfig(S3_FOLDERS.NEWS, { 
    prefix: 'news_',
    fileSize: 5 * 1024 * 1024 // 5MB for news images
  }),
  organizationLogo: createS3UploadConfig(S3_FOLDERS.ORGANIZATIONS.LOGOS, { 
    prefix: 'org_logo_',
    fileSize: 2 * 1024 * 1024 // 2MB for logos
  }),
  organizationHead: createS3UploadConfig(S3_FOLDERS.ORGANIZATIONS.HEADS, { 
    prefix: 'org_head_',
    fileSize: 3 * 1024 * 1024 // 3MB for head photos
  }),
  programMain: createS3UploadConfig(S3_FOLDERS.PROGRAMS.MAIN, { 
    prefix: 'prog_main_',
    fileSize: 5 * 1024 * 1024 // 5MB for main program images
  }),
  programAdditional: createS3UploadConfig(S3_FOLDERS.PROGRAMS.ADDITIONAL, { 
    prefix: 'prog_add_',
    files: 10, // Allow up to 10 additional images
    fileSize: 5 * 1024 * 1024 // 5MB for additional images
  }),
  postActReport: createS3UploadConfig(S3_FOLDERS.PROGRAMS.POST_ACT, { 
    fileFilter: documentFileFilter,
    fileSize: 10 * 1024 * 1024 // 10MB for post act reports
  }),
};

export default s3UploadConfigs;

