# 📁 Cloudinary Integration Documentation

## Overview

This document describes the Cloudinary integration for the FAITH-CommUNITY backend. The system has been migrated from local file storage to Cloudinary cloud storage, providing better scalability, CDN delivery, and image optimization.

## Cloudinary Configuration

### Environment Variables
Add these variables to your `backend/.env` file:

```env
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

### Folder Structure in Cloudinary

```
faith-community/
├── branding/                    # Logo, favicon, name images
├── user-profiles/              # User profile photos
├── news/                       # News featured images
├── organizations/
│   ├── logos/                  # Organization logos
│   └── heads/                  # Organization head photos
└── programs/
    ├── main/                   # Main program images
    ├── additional/             # Additional program images
    └── thumbnails/             # Program thumbnails
```

## File Naming Convention

All uploaded files follow this naming pattern:
```
{prefix}{original_name}_{timestamp}_{random_suffix}
```

### Prefixes by Type:
- **Branding**: `logo_`, `favicon_`, `name_`
- **User Profiles**: `profile_`
- **Programs**: `prog_main_`, `prog_add_`
- **Organizations**: `org_logo_`, `org_head_`
- **News**: `news_`

### Example:
```
logo_my_logo_1703123456789_123456789
```

## Usage

### 1. Import Cloudinary Configuration

```javascript
import { cloudinaryUploadConfigs } from '../utils/cloudinaryUpload.js';
import { uploadSingleToCloudinary, uploadMultipleToCloudinary } from '../utils/cloudinaryUpload.js';
```

### 2. Use Predefined Configurations

```javascript
// For branding uploads
app.post('/api/branding/upload-logo', cloudinaryUploadConfigs.branding.single('logo'), (req, res) => {
  // req.file contains the uploaded file
});

// For user profile photos
app.post('/api/users/profile/photo', cloudinaryUploadConfigs.userProfile.single('profilePhoto'), (req, res) => {
  // req.file contains the uploaded file
});

// For program images
app.post('/api/programs', cloudinaryUploadConfigs.programMain.single('image'), (req, res) => {
  // req.file contains the uploaded file
});
```

### 3. Upload to Cloudinary

```javascript
import { uploadSingleToCloudinary, CLOUDINARY_FOLDERS } from '../utils/cloudinaryUpload.js';

// Upload single file
const uploadResult = await uploadSingleToCloudinary(
  req.file, 
  CLOUDINARY_FOLDERS.PROGRAMS.MAIN,
  { prefix: 'prog_main_' }
);

// Response includes Cloudinary URL and metadata
const response = {
  success: true,
  url: uploadResult.url,
  public_id: uploadResult.public_id,
  cloudinary_info: {
    format: uploadResult.format,
    width: uploadResult.width,
    height: uploadResult.height,
    size: uploadResult.size
  }
};
```

### 4. File Validation

The system automatically validates:
- **File types**: JPEG, PNG, GIF, WebP, SVG for images
- **File size**: Configurable limits (2MB for branding, 5MB for programs)
- **File count**: 1 file default, up to 10 for additional images

### 5. Error Handling

```javascript
app.post('/api/upload', cloudinaryUploadConfigs.programMain.single('image'), (req, res) => {
  if (req.fileValidationError) {
    return res.status(400).json({ error: req.fileValidationError });
  }
  
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }
  
  // Process the file with Cloudinary
  try {
    const result = await uploadSingleToCloudinary(req.file, CLOUDINARY_FOLDERS.PROGRAMS.MAIN);
    res.json({ success: true, url: result.url });
  } catch (error) {
    res.status(500).json({ error: 'Upload failed' });
  }
});
```

## Image URL Generation

### Backend Utilities

```javascript
import { getImageUrl, getOrganizationLogoUrl, getProgramImageUrl } from '../utils/imageUrlUtils.js';

// Get optimized image URL
const imageUrl = getImageUrl(imagePath, fallbackUrl);

// Get organization logo URL
const logoUrl = getOrganizationLogoUrl(orgLogo);

// Get program image URL
const programImageUrl = getProgramImageUrl(programImage);
```

### Frontend Utilities

```javascript
import { getImageUrl, getOrganizationImageUrl, getProgramImageUrl } from '@/utils/uploadPaths';

// Get image URL with Cloudinary optimization
const imageUrl = getImageUrl(imagePath, 'programs', 'main');

// Get organization image URL
const orgImageUrl = getOrganizationImageUrl(orgLogo, 'logo');
```

## Cloudinary Features

### 1. Automatic Optimization
- **Format conversion**: Automatic WebP/AVIF when supported
- **Quality optimization**: Automatic quality adjustment
- **Responsive images**: Different sizes for different devices
- **Lazy loading**: Built-in lazy loading support

### 2. Image Transformations

```javascript
import { generateCloudinaryUrl } from '../utils/cloudinaryConfig.js';

// Get thumbnail (150x150)
const thumbnailUrl = generateCloudinaryUrl(publicId, { 
  width: 150, 
  height: 150, 
  crop: 'fill' 
});

// Get responsive image
const responsiveUrl = generateCloudinaryUrl(publicId, { 
  width: 800, 
  height: 600, 
  crop: 'fill',
  quality: 'auto',
  format: 'auto'
});
```

### 3. File Management

```javascript
import { deleteFromCloudinary, extractPublicIdFromUrl } from '../utils/cloudinaryConfig.js';

// Delete file from Cloudinary
const publicId = extractPublicIdFromUrl(imageUrl);
if (publicId) {
  await deleteFromCloudinary(publicId);
}
```

## Migration from Local Storage

### 1. Legacy Path Handling

The system gracefully handles both Cloudinary URLs and legacy local paths:

```javascript
// Backend utility automatically handles both
const imageUrl = getImageUrl(imagePath, fallbackUrl);

// Frontend utility with fallback support
const imageUrl = getImageUrl(imagePath, 'programs', 'main');
```

### 2. Gradual Migration

- New uploads automatically go to Cloudinary
- Existing local files continue to work with fallback handling
- Legacy paths are detected and fallback images are used

## Best Practices

### 1. File Organization
- Always use the appropriate Cloudinary folder for each file type
- Use descriptive prefixes for easy identification
- Leverage Cloudinary's automatic organization

### 2. Security
- Files are automatically sanitized (special characters removed)
- File types are strictly validated
- File sizes are limited to prevent abuse
- API secrets are never exposed in client-side code

### 3. Performance
- All images served via Cloudinary CDN
- Automatic format optimization (WebP/AVIF)
- Responsive image delivery
- Built-in caching and compression

### 4. Maintenance
- Cloudinary handles file cleanup automatically
- No local disk space management needed
- Automatic backup and redundancy
- Usage monitoring through Cloudinary dashboard

## Configuration Options

### Custom Upload Configuration

```javascript
import { createCloudinaryUploadConfig } from '../utils/cloudinaryUpload.js';

const customUpload = createCloudinaryUploadConfig('custom-folder', {
  fileSize: 10 * 1024 * 1024, // 10MB
  files: 5, // Allow 5 files
  prefix: 'custom_',
  fileFilter: (req, file, cb) => {
    // Custom file filter logic
    cb(null, true);
  }
});
```

### Environment Configuration

```javascript
// Test Cloudinary connection
import { testCloudinaryConnection } from '../utils/cloudinaryConfig.js';

const isConnected = await testCloudinaryConnection();
if (!isConnected) {
  console.error('Cloudinary connection failed');
}
```

## Troubleshooting

### Common Issues

1. **"Cloudinary connection failed"**
   - Check environment variables
   - Verify API credentials
   - Check network connectivity

2. **"File too large"**
   - Check file size limits in upload configuration
   - Compress images before upload

3. **"Invalid file type"**
   - Check file type restrictions
   - Ensure file has proper extension

4. **"Upload failed"**
   - Check Cloudinary account limits
   - Verify folder permissions
   - Check network connectivity

### Debug Mode

Enable debug logging by setting:
```env
DEBUG=cloudinary:*
```

## Performance Benefits

- **Faster loading**: CDN delivery
- **Reduced server load**: No local file serving
- **Automatic optimization**: Images optimized for web
- **Scalability**: Handle high traffic without server storage limits
- **Global delivery**: Images served from nearest CDN location

## Cost Considerations

- **Free tier**: 25GB storage, 25GB bandwidth/month
- **Pay-as-you-go**: Additional usage billed per GB
- **Optimization**: Automatic format conversion reduces bandwidth usage
- **Monitoring**: Track usage through Cloudinary dashboard

## Support

For issues with Cloudinary integration:
1. Check the troubleshooting section
2. Review Cloudinary documentation
3. Check server logs for detailed error messages
4. Verify environment variables are correctly set
5. Test connection with `node test-cloudinary.js`

## Files Reference

- **Configuration**: `backend/back_end/utils/cloudinaryConfig.js`
- **Upload utilities**: `backend/back_end/utils/cloudinaryUpload.js`
- **Image utilities**: `backend/back_end/utils/imageUrlUtils.js`
- **Test script**: `backend/test-cloudinary.js`
- **Frontend utilities**: `frontend/src/utils/uploadPaths.js`