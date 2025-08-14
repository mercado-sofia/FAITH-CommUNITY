import multer from "multer";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Base uploads directory
const baseUploadsDir = path.join(__dirname, "../../uploads");

// Define upload directories by type
const uploadDirectories = {
  programs: {
    main: path.join(baseUploadsDir, "programs", "main-images"),
    additional: path.join(baseUploadsDir, "programs", "additional-images"),
    thumbnails: path.join(baseUploadsDir, "programs", "thumbnails")
  },
  organizations: {
    logos: path.join(baseUploadsDir, "organizations", "logos"),
    heads: path.join(baseUploadsDir, "organizations", "heads")
  },
  volunteers: {
    validIds: path.join(baseUploadsDir, "volunteers", "valid-ids")
  },
  news: {
    images: path.join(baseUploadsDir, "news", "images")
  },
  temp: {
    processing: path.join(baseUploadsDir, "temp", "processing")
  }
};

// Ensure all upload directories exist
const ensureUploadDirectories = () => {
  console.log('📁 Creating upload directory structure...');
  
  // Create base directory
  if (!fs.existsSync(baseUploadsDir)) {
    fs.mkdirSync(baseUploadsDir, { recursive: true });
    console.log('✅ Created base uploads directory:', baseUploadsDir);
  }

  // Create all subdirectories
  Object.values(uploadDirectories).forEach(category => {
    Object.values(category).forEach(dir => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
        console.log('✅ Created directory:', dir);
      }
    });
  });
  
  console.log('📁 Upload directory structure ready!');
};

// Generate unique filename
const generateUniqueFilename = (originalname, prefix = '') => {
  const timestamp = Date.now();
  const randomSuffix = Math.round(Math.random() * 1e9);
  const extension = path.extname(originalname);
  const baseName = path.basename(originalname, extension);
  const sanitizedBaseName = baseName.replace(/[^a-zA-Z0-9]/g, "_");
  
  return `${prefix}${sanitizedBaseName}-${timestamp}-${randomSuffix}${extension}`;
};

// File filter for images
const imageFileFilter = (req, file, cb) => {
  const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/gif", "image/webp"];
  
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Only JPEG, PNG, GIF, and WebP images are allowed"), false);
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

// Create multer configuration for different upload types
const createUploadConfig = (type, subType, options = {}) => {
  const {
    fileFilter = imageFileFilter,
    fileSize = 5 * 1024 * 1024, // 5MB default
    files = 1,
    prefix = ''
  } = options;

  const uploadDir = uploadDirectories[type]?.[subType];
  
  if (!uploadDir) {
    throw new Error(`Invalid upload type: ${type}/${subType}`);
  }

  const storage = multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
      const filename = generateUniqueFilename(file.originalname, prefix);
      cb(null, filename);
    },
  });

  return multer({
    storage,
    fileFilter,
    limits: {
      fileSize,
      files
    },
  });
};

// Predefined upload configurations
export const uploadConfigs = {
  // Program uploads
  programMainImage: createUploadConfig('programs', 'main', { prefix: 'prog_main_' }),
  programAdditionalImages: createUploadConfig('programs', 'additional', { 
    files: 10, // Allow up to 10 additional images
    prefix: 'prog_add_' 
  }),
  
  // Organization uploads
  organizationLogo: createUploadConfig('organizations', 'logos', { prefix: 'org_logo_' }),
  organizationHead: createUploadConfig('organizations', 'heads', { prefix: 'org_head_' }),
  
  // Volunteer uploads
  volunteerValidId: createUploadConfig('volunteers', 'validIds', { 
    fileFilter: documentFileFilter,
    prefix: 'vol_id_' 
  }),
  
  // News uploads
  newsImage: createUploadConfig('news', 'images', { prefix: 'news_img_' })
};

// Utility functions
export const getUploadPath = (type, subType) => {
  return uploadDirectories[type]?.[subType] || null;
};

export const getPublicUrl = (filePath) => {
  if (!filePath) return null;
  
  // Convert absolute path to public URL
  const relativePath = filePath.replace(baseUploadsDir, '');
  return `/uploads${relativePath}`;
};

// Initialize upload directories
ensureUploadDirectories();

export default uploadConfigs;
