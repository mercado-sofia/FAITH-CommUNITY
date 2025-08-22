# Profile Photo Upload Feature

## Overview
This feature allows general users (not admin or superadmin) to upload and change their profile photos in the Manage Account section.

## Implementation Details

### Backend
- **Route**: `POST /api/users/profile/photo`
- **Authentication**: Required (JWT token)
- **File Upload**: Uses Multer middleware
- **Storage**: Files are stored in `/backend/uploads/user-profile/`
- **Database**: Updates `profile_photo_url` column in `users` table

### Frontend
- **Location**: `/profile` page (general users only)
- **UI**: Hover overlay on profile image with camera icon
- **File Validation**: 
  - Only image files allowed
  - Maximum size: 5MB
- **User Experience**: 
  - Loading spinner during upload
  - Success/error messages
  - Automatic profile update

### File Flow
1. User selects image file
2. File is uploaded to `/uploads/temp/processing/`
3. Backend moves file to `/uploads/user-profile/`
4. Database is updated with new photo URL
5. Frontend updates user data and displays new photo

### Security Features
- File type validation (images only)
- File size limits (5MB)
- Authentication required
- Unique filename generation
- Sanitized file paths

### Database Schema
```sql
ALTER TABLE users ADD COLUMN profile_photo_url VARCHAR(500);
```

### Static File Serving
Profile photos are served via Express static middleware:
```javascript
app.use("/uploads", express.static(uploadsDir))
```

## Usage
1. Navigate to profile page (`/profile`)
2. Hover over profile image
3. Click "Change Photo" button
4. Select image file
5. Photo will be uploaded and displayed immediately

## Error Handling
- Invalid file type
- File too large
- Upload failures
- Network errors
- Database errors

All errors are displayed to the user with appropriate messages.
