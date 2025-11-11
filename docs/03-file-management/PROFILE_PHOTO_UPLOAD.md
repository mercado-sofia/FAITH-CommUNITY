# Profile Photo Upload Feature

## Overview
This feature allows general users (not admin or superadmin) to upload and change their profile photos in the Manage Account section. The system uses Cloudinary for cloud storage, providing better performance and scalability.

## Implementation Details

### Backend
- **Route**: `POST /api/users/profile/photo`
- **Authentication**: Required (JWT token)
- **File Upload**: Uses Multer middleware with Cloudinary integration
- **Storage**: Files are stored in Cloudinary under `faith-community/user-profiles/`
- **Database**: Updates `profile_photo_url` column in `users` table with Cloudinary URL

### Frontend
- **Location**: `/profile` page (general users only)
- **UI**: Hover overlay on profile image with camera icon
- **File Validation**: 
  - Only image files allowed (JPEG, PNG, GIF, WebP, SVG)
  - Maximum size: 3MB
- **User Experience**: 
  - Loading spinner during upload
  - Success/error messages
  - Automatic profile update
  - Optimized image delivery via Cloudinary CDN

### File Flow
1. User selects image file
2. File is uploaded to Cloudinary using memory storage
3. Cloudinary processes and optimizes the image
4. Database is updated with Cloudinary URL
5. Frontend displays optimized image from Cloudinary CDN

### Security Features
- File type validation (images only)
- File size limits (3MB)
- Authentication required
- Unique filename generation with timestamp and random suffix
- Secure Cloudinary API key management
- Automatic image optimization and format conversion

### Database Schema
```sql
ALTER TABLE users ADD COLUMN profile_photo_url VARCHAR(500);
```

### Cloudinary Integration
Profile photos are stored and served via Cloudinary:
- **Folder**: `faith-community/user-profiles/`
- **Prefix**: `profile_`
- **Optimization**: Automatic format conversion (WebP/AVIF)
- **CDN**: Global content delivery network
- **Transformations**: Automatic quality and size optimization

## Usage
1. Navigate to profile page (`/profile`)
2. Hover over profile image
3. Click "Change Photo" button
4. Select image file
5. Photo will be uploaded to Cloudinary and displayed immediately

## API Response Format

### Successful Upload
```json
{
  "message": "Profile photo uploaded successfully",
  "profilePhotoUrl": "https://res.cloudinary.com/your-cloud/image/upload/v1234567890/faith-community/user-profiles/profile_filename.jpg",
  "cloudinary_info": {
    "public_id": "faith-community/user-profiles/profile_filename",
    "format": "jpg",
    "width": 800,
    "height": 600,
    "size": 125000
  },
  "user": {
    "id": 123,
    "profile_photo_url": "https://res.cloudinary.com/your-cloud/image/upload/v1234567890/faith-community/user-profiles/profile_filename.jpg"
  }
}
```

### Error Response
```json
{
  "error": "No file uploaded"
}
```

## Image Optimization Features

### Automatic Optimizations
- **Format conversion**: Automatic WebP/AVIF when supported by browser
- **Quality optimization**: Automatic quality adjustment based on content
- **Responsive delivery**: Different sizes for different devices
- **Lazy loading**: Built-in lazy loading support

### Image Transformations
```javascript
// Get thumbnail (150x150)
const thumbnailUrl = generateCloudinaryUrl(publicId, { 
  width: 150, 
  height: 150, 
  crop: 'fill' 
});

// Get optimized profile image
const profileUrl = generateCloudinaryUrl(publicId, { 
  width: 300, 
  height: 300, 
  crop: 'fill',
  quality: 'auto',
  format: 'auto'
});
```

## Error Handling
- Invalid file type
- File too large (>3MB)
- Upload failures
- Network errors
- Database errors
- Cloudinary API errors

All errors are displayed to the user with appropriate messages and logged for debugging.

## File Management

### Upload Process
```javascript
// Upload to Cloudinary
const uploadResult = await uploadSingleToCloudinary(
  req.file, 
  CLOUDINARY_FOLDERS.USER_PROFILES,
  { prefix: 'profile_' }
);
```

### Delete Process
```javascript
// Delete from Cloudinary
const publicId = extractPublicIdFromUrl(currentPhotoUrl);
if (publicId) {
  await deleteFromCloudinary(publicId);
}
```

## Performance Benefits

### Cloudinary Advantages
- **CDN Delivery**: Images served from nearest location
- **Automatic Optimization**: Format and quality optimization
- **Scalability**: No server storage limits
- **Global Performance**: Fast loading worldwide
- **Bandwidth Savings**: Automatic compression

### Frontend Integration
```javascript
// Frontend image utility
import { getImageUrl } from '@/utils/uploadPaths';

const profileImageUrl = getImageUrl(user.profile_photo_url, '/default-profile.png');
```

## Migration Notes

### Legacy Support
The system gracefully handles both Cloudinary URLs and legacy local paths:
- New uploads go to Cloudinary
- Existing local files continue to work with fallback handling
- Legacy paths are detected and fallback images are used

### Fallback Handling
```javascript
// Automatic fallback for missing images
if (!profilePhotoUrl || !profilePhotoUrl.includes('cloudinary.com')) {
  return '/default-profile.png';
}
```

## Configuration

### Environment Variables
```env
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

### Upload Configuration
```javascript
// User profile upload configuration
const upload = cloudinaryUploadConfigs.userProfile;
```

## Testing

### Test Upload
```bash
# Test Cloudinary connection
cd backend
node test-cloudinary.js
```

### Manual Testing
1. Login as a regular user
2. Navigate to profile page
3. Upload a profile photo
4. Verify image appears correctly
5. Test image optimization by checking network tab

## Troubleshooting

### Common Issues
1. **Upload fails**: Check Cloudinary credentials and network
2. **Image not displaying**: Verify Cloudinary URL format
3. **File too large**: Check file size limits
4. **Invalid file type**: Ensure file is a valid image format

### Debug Information
- Check browser network tab for upload requests
- Verify Cloudinary dashboard for uploaded files
- Check server logs for error messages
- Test with different image formats and sizes

## Future Enhancements
- Multiple profile photo options
- Image cropping before upload
- Batch photo uploads
- Photo galleries
- Advanced image transformations