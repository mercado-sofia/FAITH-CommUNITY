# 📁 Upload System Documentation

## Overview

This document describes the organized upload system for the FAITH-CommUNITY backend. The system provides a structured approach to file uploads with proper organization, validation, and scalability.

## Directory Structure

```
backend/uploads/
├── programs/
│   ├── main-images/          # Main program images (required)
│   ├── additional-images/    # Additional program images (optional)
│   └── thumbnails/          # Generated thumbnails
├── organizations/
│   ├── logos/               # Organization logos
│   └── heads/               # Organization head photos
├── volunteers/
│   └── valid-ids/           # Volunteer valid ID documents
├── news/
│   └── images/              # News article images
└── temp/
    └── processing/          # Temporary files for processing
```

## File Naming Convention

All uploaded files follow this naming pattern:
```
{prefix}{original_name}-{timestamp}-{random_suffix}.{extension}
```

### Prefixes by Type:
- **Programs**: `prog_main_`, `prog_add_`
- **Organizations**: `org_logo_`, `org_head_`
- **Volunteers**: `vol_id_`
- **News**: `news_img_`

### Example:
```
prog_main_my_program-1703123456789-123456789.jpg
```

## Usage

### 1. Import Upload Configuration

```javascript
import { uploadConfigs } from '../utils/uploadConfig.js';
```

### 2. Use Predefined Configurations

```javascript
// For program main image
app.post('/api/programs', uploadConfigs.programMainImage.single('image'), (req, res) => {
  // req.file contains the uploaded file
});

// For program additional images (multiple files)
app.post('/api/programs', uploadConfigs.programAdditionalImages.array('images', 10), (req, res) => {
  // req.files contains array of uploaded files
});

// For organization logo
app.post('/api/organizations', uploadConfigs.organizationLogo.single('logo'), (req, res) => {
  // req.file contains the uploaded file
});
```

### 3. File Validation

The system automatically validates:
- **File types**: JPEG, PNG, GIF, WebP for images; PDF for documents
- **File size**: 5MB default (configurable)
- **File count**: 1 file default, up to 10 for additional images

### 4. Error Handling

```javascript
app.post('/api/upload', uploadConfigs.programMainImage.single('image'), (req, res) => {
  if (req.fileValidationError) {
    return res.status(400).json({ error: req.fileValidationError });
  }
  
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }
  
  // Process the file
  res.json({ 
    success: true, 
    filename: req.file.filename,
    path: req.file.path 
  });
});
```

## Migration from Old Structure

### 1. Run Migration Script

```bash
cd backend
node scripts/migrateUploads.js
```

### 2. Review Temporary Files

Check `uploads/temp/processing/` for files that couldn't be automatically categorized.

### 3. Update Code References

Update any hardcoded file paths in your controllers to use the new structure.

## Best Practices

### 1. File Organization
- Always use the appropriate upload configuration for each file type
- Don't mix different file types in the same directory
- Use descriptive prefixes for easy identification

### 2. Security
- Files are automatically sanitized (special characters removed)
- File types are strictly validated
- File sizes are limited to prevent abuse

### 3. Performance
- Large files are stored in organized directories
- Consider implementing image compression for thumbnails
- Use CDN for production environments

### 4. Maintenance
- Regularly clean up temporary files
- Monitor disk space usage
- Implement file cleanup for deleted records

## Configuration Options

### Custom Upload Configuration

```javascript
import { createUploadConfig } from '../utils/uploadConfig.js';

const customUpload = createUploadConfig('programs', 'main', {
  fileSize: 10 * 1024 * 1024, // 10MB
  files: 5, // Allow 5 files
  prefix: 'custom_',
  fileFilter: (req, file, cb) => {
    // Custom file filter logic
    cb(null, true);
  }
});
```

### Utility Functions

```javascript
import { getUploadPath, getPublicUrl } from '../utils/uploadConfig.js';

// Get upload directory path
const uploadPath = getUploadPath('programs', 'main');

// Convert file path to public URL
const publicUrl = getPublicUrl('/path/to/file.jpg');
// Returns: /uploads/programs/main-images/file.jpg
```

## Troubleshooting

### Common Issues

1. **File not uploaded**: Check file size and type restrictions
2. **Directory not found**: Ensure upload directories are created
3. **Permission errors**: Check file system permissions
4. **Path issues**: Use absolute paths for file operations

### Debug Mode

Enable debug logging by setting environment variable:
```bash
DEBUG=uploads node app.js
```

## Future Enhancements

1. **Image Processing**: Automatic thumbnail generation
2. **Cloud Storage**: Integration with AWS S3 or similar
3. **File Compression**: Automatic image optimization
4. **CDN Integration**: Content delivery network support
5. **Backup System**: Automated file backup and recovery

## Support

For issues or questions about the upload system, refer to:
- This documentation
- Upload configuration file: `backend/back_end/utils/uploadConfig.js`
- Migration script: `backend/scripts/migrateUploads.js`
