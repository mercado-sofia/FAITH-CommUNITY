# Cloudinary Integration Guide

This guide explains how to migrate from local file storage to Cloudinary for the FAITH-CommUNITY project.

## Overview

The project has been updated to use Cloudinary for file storage instead of local `/uploads` directory. This provides:
- Better scalability
- CDN delivery
- Image optimization
- Automatic format conversion
- Reduced server storage requirements

## Prerequisites

1. **Cloudinary Account**: Sign up at [cloudinary.com](https://cloudinary.com)
2. **Environment Variables**: Add your Cloudinary credentials to `.env`

## Environment Setup

Add these variables to your `backend/.env` file:

```env
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

## File Structure Changes

### New Files Added:
- `backend/src/utils/cloudinaryConfig.js` - Cloudinary configuration and utilities
- `backend/src/utils/cloudinaryUpload.js` - Upload middleware and helpers
- `backend/test-cloudinary.js` - Test script for Cloudinary integration

### Modified Files:
- `backend/src/superadmin/controllers/brandingController.js` - Updated for Cloudinary
- `backend/src/superadmin/routes/branding.js` - Updated upload middleware
- `backend/src/(public)/controllers/userController.js` - Updated profile photo upload
- `backend/src/(public)/routes/users.js` - Updated upload middleware

## Cloudinary Folder Structure

Files are organized in Cloudinary with the following folder structure:

```
faith-community/
├── branding/           # Logo, favicon, name images
├── user-profiles/      # User profile photos
├── news/              # News featured images
├── organizations/
│   ├── logos/         # Organization logos
│   └── heads/         # Organization head photos
└── programs/
    ├── main/          # Main program images
    ├── additional/    # Additional program images
    └── thumbnails/    # Program thumbnails
```

## Testing the Integration

1. **Test Connection**:
   ```bash
   cd backend
   node test-cloudinary.js
   ```

2. **Start the Server**:
   ```bash
   npm run dev
   ```

3. **Test Upload Endpoints**:
   - Branding uploads: `POST /api/superadmin/branding/upload-logo`
   - Profile photos: `POST /api/users/upload-profile-photo`
   - News images: `POST /api/admin/news/upload-featured-image`

## API Response Changes

### Before (Local Storage - Deprecated):
```json
{
  "success": true,
  "message": "Logo uploaded successfully",
  "data": { 
    "logo_url": "/uploads/branding/logo-1234567890.jpg" 
  }
}
```

### After (Cloudinary):
```json
{
  "success": true,
  "message": "Logo uploaded successfully",
  "data": { 
    "logo_url": "https://res.cloudinary.com/your-cloud/image/upload/v1234567890/faith-community/branding/logo_filename.jpg",
    "public_id": "faith-community/branding/logo_filename",
    "cloudinary_info": {
      "format": "jpg",
      "width": 800,
      "height": 600,
      "size": 125000
    }
  }
}
```

## Migration Steps for Existing Data

### Option 1: Gradual Migration (Recommended)
1. Keep existing local files
2. New uploads go to Cloudinary
3. Migrate existing files as needed

### Option 2: Complete Migration
1. Upload existing files to Cloudinary
2. Update database URLs
3. Remove local files

## Image Optimization Features

Cloudinary provides automatic:
- **Format optimization**: Converts to WebP/AVIF when supported
- **Quality optimization**: Automatic quality adjustment
- **Responsive images**: Different sizes for different devices
- **Lazy loading**: Built-in lazy loading support

### Example: Get Optimized Image URL
```javascript
import { getOptimizedImageUrl } from './utils/cloudinaryConfig.js';

// Get thumbnail (150x150)
const thumbnailUrl = getOptimizedImageUrl(publicId, { width: 150, height: 150 });

// Get responsive image
const responsiveUrl = getOptimizedImageUrl(publicId, { 
  width: 800, 
  height: 600, 
  crop: 'fill',
  quality: 'auto',
  format: 'auto'
});
```

## Error Handling

The integration includes comprehensive error handling:
- File size limits
- File type validation
- Cloudinary upload errors
- Network connectivity issues

## Security Considerations

1. **API Key Security**: Never expose API secrets in client-side code
2. **Upload Limits**: File size and type restrictions are enforced
3. **Access Control**: Upload endpoints require proper authentication
4. **Public ID Security**: Public IDs are generated securely

## Troubleshooting

### Common Issues:

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

### Debug Mode:
Enable debug logging by setting:
```env
DEBUG=cloudinary:*
```

## Performance Benefits

- **Faster loading**: CDN delivery
- **Reduced server load**: No local file serving
- **Automatic optimization**: Images optimized for web
- **Scalability**: Handle high traffic without server storage limits

## Cost Considerations

- **Free tier**: 25GB storage, 25GB bandwidth/month
- **Pay-as-you-go**: Additional usage billed per GB
- **Optimization**: Automatic format conversion reduces bandwidth usage

## Next Steps

1. Test the integration with the provided test script
2. Update frontend to handle new URL format
3. Consider implementing image transformations for different use cases
4. Set up monitoring for Cloudinary usage
5. Plan migration strategy for existing files

## Support

For issues with this integration:
1. Check the troubleshooting section
2. Review Cloudinary documentation
3. Check server logs for detailed error messages
4. Verify environment variables are correctly set
