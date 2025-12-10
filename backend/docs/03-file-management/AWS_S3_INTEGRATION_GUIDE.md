# AWS S3 Integration Guide

This guide explains how AWS S3 is used for file storage in the FAITH CommUNITY project, specifically for Post-Act Report documents.

## Overview

The project uses **AWS S3** for storing Post-Act Report documents (PDFs, DOC, DOCX, and images). This is separate from Cloudinary, which handles image uploads for branding, profiles, news, and programs.

### Storage Strategy

- **Cloudinary**: Used for images (profile photos, branding, news, programs, organizations)
- **AWS S3**: Used for Post-Act Report documents (PDFs, DOC, DOCX, and supporting images)

This separation allows:
- Better document management for reports
- Cost-effective storage for larger files
- Proper organization of program documentation
- Support for various document formats

## Prerequisites

1. **AWS Account**: Sign up at [aws.amazon.com](https://aws.amazon.com)
2. **S3 Bucket**: Create an S3 bucket for file storage
3. **IAM User**: Create an IAM user with S3 access permissions
4. **Environment Variables**: Add your AWS credentials to `.env`

## Environment Setup

Add these variables to your `backend/.env` file:

```env
# AWS S3 Configuration (Required for Post-Act Reports)
AWS_REGION=ap-northeast-1
AWS_ACCESS_KEY_ID=your-access-key-id
AWS_SECRET_ACCESS_KEY=your-secret-access-key
AWS_S3_BUCKET_NAME=faith-community-files

# Optional: CloudFront CDN URL (for faster delivery)
AWS_CLOUDFRONT_URL=https://xxxxx.cloudfront.net
```

### AWS S3 Bucket Setup

1. **Create S3 Bucket**:
   - Go to AWS S3 Console
   - Create a new bucket
   - Choose a region (e.g., `ap-northeast-1`)
   - Enable public access if needed (or use bucket policy)

2. **Configure Bucket Policy** (for public read access):
   ```json
   {
     "Version": "2012-10-17",
     "Statement": [
       {
         "Sid": "PublicReadGetObject",
         "Effect": "Allow",
         "Principal": "*",
         "Action": "s3:GetObject",
         "Resource": "arn:aws:s3:::your-bucket-name/*"
       }
     ]
   }
   ```

3. **Create IAM User**:
   - Go to IAM Console → Users → Create User
   - Attach policy: `AmazonS3FullAccess` (or create custom policy)
   - Generate Access Key ID and Secret Access Key
   - Save credentials securely

## File Structure

Files are organized in S3 with the following folder structure:

```
faith-community/
└── programs/
    └── post-act-reports/    # Post-Act Report documents
        ├── post_act_report_filename_1234567890_123456789.pdf
        ├── post_act_report_filename_1234567890_123456789.docx
        └── post_act_report_filename_1234567890_123456789.jpg
```

## Implementation Details

### Backend Files

- **`backend/src/utils/s3Config.js`** - S3 client configuration and utilities
- **`backend/src/utils/s3Upload.js`** - Upload middleware and helpers
- **`backend/src/admin/controllers/postActReportController.js`** - Post-Act Report upload controller
- **`backend/src/admin/routes/upload.js`** - Upload route handlers

### File Upload Flow

1. Admin uploads Post-Act Report via admin portal
2. File is validated (type, size)
3. File is uploaded to S3 using `@aws-sdk/lib-storage`
4. S3 returns file URL
5. Database records file URL and metadata
6. Submission created for superadmin approval

### Supported File Types

Post-Act Reports support:
- **Images**: JPEG, PNG, WEBP, HEIC
- **Documents**: PDF, DOC, DOCX
- **Maximum Size**: 10MB per file

## API Usage

### Upload Post-Act Report

**Endpoint**: `POST /api/admin/programs/:id/post-act-report`

**Request**:
```javascript
const formData = new FormData();
formData.append('file', fileInput.files[0]);

fetch('/api/admin/programs/123/post-act-report', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`
  },
  body: formData
});
```

**Response**:
```json
{
  "success": true,
  "message": "Post Act Report uploaded successfully",
  "data": {
    "report_id": 456,
    "file_url": "https://bucket.s3.ap-northeast-1.amazonaws.com/faith-community/programs/post-act-reports/post_act_report_filename_1234567890_123456789.pdf",
    "file_public_id": "faith-community/programs/post-act-reports/post_act_report_filename_1234567890_123456789.pdf",
    "status": "pending"
  }
}
```

## Code Examples

### Upload File to S3

```javascript
import { uploadSingleToS3 } from './utils/s3Upload.js';
import { S3_FOLDERS } from './utils/s3Config.js';

const uploadResult = await uploadSingleToS3(
  req.file,
  S3_FOLDERS.PROGRAMS.POST_ACT,
  { prefix: 'post_act_' }
);

// Returns:
// {
//   success: true,
//   url: 'https://bucket.s3.region.amazonaws.com/path/to/file',
//   key: 'faith-community/programs/post-act-reports/filename.pdf',
//   public_id: 'faith-community/programs/post-act-reports/filename.pdf',
//   size: 1024000,
//   format: 'pdf',
//   content_type: 'application/pdf'
// }
```

### Delete File from S3

```javascript
import { deleteFromS3, extractKeyFromUrl } from './utils/s3Upload.js';

const fileUrl = 'https://bucket.s3.region.amazonaws.com/path/to/file.pdf';
const key = extractKeyFromUrl(fileUrl);

await deleteFromS3(key);
```

### Generate S3 URL

```javascript
import { getS3Url } from './utils/s3Config.js';

const key = 'faith-community/programs/post-act-reports/filename.pdf';
const url = getS3Url(key);
// Returns: https://bucket.s3.region.amazonaws.com/faith-community/programs/post-act-reports/filename.pdf
```

## Region Detection

The S3 integration automatically detects the correct bucket region:

1. First attempts to use configured `AWS_REGION`
2. If upload fails with region error, detects correct region from error response
3. Updates S3 client with correct region
4. Retries upload with correct region

This ensures compatibility with buckets in any AWS region.

## CloudFront Integration (Optional)

For faster global delivery, you can use CloudFront CDN:

1. **Create CloudFront Distribution**:
   - Origin: Your S3 bucket
   - Enable caching
   - Configure access settings

2. **Set Environment Variable**:
   ```env
   AWS_CLOUDFRONT_URL=https://xxxxx.cloudfront.net
   ```

3. **URLs Automatically Use CloudFront**:
   - If `AWS_CLOUDFRONT_URL` is set, all S3 URLs use CloudFront
   - Otherwise, direct S3 URLs are used

## Error Handling

The integration includes comprehensive error handling:

- **Region Mismatch**: Automatically detects and retries with correct region
- **Upload Failures**: Detailed error logging with context
- **File Validation**: Type and size validation before upload
- **Network Errors**: Retry logic for transient failures

### Common Errors

1. **"Access Denied"**
   - Check IAM user permissions
   - Verify bucket policy
   - Check AWS credentials

2. **"Bucket Not Found"**
   - Verify bucket name matches `AWS_S3_BUCKET_NAME`
   - Check bucket exists in specified region

3. **"Region Mismatch"**
   - System automatically handles this
   - Check logs for detected region

## Security Considerations

1. **IAM Permissions**: Use least-privilege principle
   - Only grant S3 access to specific bucket
   - Use IAM policies, not bucket ACLs

2. **Access Keys**: Never commit credentials to version control
   - Use environment variables
   - Rotate keys regularly

3. **Bucket Policy**: Configure appropriate public/private access
   - Public read for approved reports
   - Private for pending submissions

4. **File Validation**: Always validate file types and sizes
   - Prevents malicious file uploads
   - Protects against DoS attacks

## Testing

### Test S3 Connection

```javascript
import { testS3Connection } from './utils/s3Config.js';

const isConnected = await testS3Connection();
console.log('S3 Connection:', isConnected ? 'Success' : 'Failed');
```

### Test Upload

1. Start the backend server
2. Use admin account to upload Post-Act Report
3. Check S3 bucket for uploaded file
4. Verify file URL in database

## Troubleshooting

### Issue: Upload Fails with "PermanentRedirect"

**Solution**: The system automatically handles region detection. Check logs for detected region and verify `AWS_REGION` matches bucket region.

### Issue: Files Not Accessible

**Solution**: 
- Check bucket policy allows public read
- Verify CloudFront distribution (if used) is configured correctly
- Check file URLs in database match S3 bucket structure

### Issue: "Access Denied" Errors

**Solution**:
- Verify IAM user has `s3:PutObject` and `s3:GetObject` permissions
- Check bucket policy allows operations
- Verify AWS credentials are correct

## Cost Considerations

- **Storage**: Pay per GB stored per month
- **Requests**: Pay per PUT/GET request
- **Data Transfer**: Pay for data transfer out (first 1GB free per month)
- **CloudFront**: Additional cost for CDN delivery (optional)

### Cost Optimization Tips

1. **Lifecycle Policies**: Automatically delete old files after retention period
2. **Storage Classes**: Use S3 Standard-IA for infrequently accessed files
3. **Compression**: Compress files before upload
4. **CloudFront**: Use CloudFront for frequently accessed files

## Migration Notes

### From Local Storage

If migrating from local file storage:

1. Upload existing files to S3
2. Update database URLs
3. Remove local files
4. Update frontend to handle S3 URLs

### From Cloudinary

Post-Act Reports should use S3, not Cloudinary:
- S3 is better for documents (PDFs, DOC, DOCX)
- Cloudinary is optimized for images
- Separation allows better cost management

## Performance Benefits

- **Scalability**: Handle large files without server storage limits
- **Reliability**: AWS S3 provides 99.999999999% durability
- **Global Access**: Files accessible from anywhere
- **CDN Integration**: CloudFront provides fast global delivery
- **Cost Effective**: Pay only for what you use

## Next Steps

1. Set up AWS S3 bucket and IAM user
2. Configure environment variables
3. Test upload functionality
4. Set up CloudFront (optional)
5. Configure lifecycle policies for old files
6. Monitor usage and costs

## Support

For issues with S3 integration:
1. Check AWS S3 Console for bucket status
2. Review IAM permissions
3. Check server logs for detailed errors
4. Verify environment variables are correctly set
5. Test S3 connection using `testS3Connection()`

## Additional Resources

- [AWS S3 Documentation](https://docs.aws.amazon.com/s3/)
- [AWS SDK for JavaScript v3](https://docs.aws.amazon.com/sdk-for-javascript/v3/)
- [S3 Bucket Policies](https://docs.aws.amazon.com/AmazonS3/latest/userguide/bucket-policies.html)
- [CloudFront Documentation](https://docs.aws.amazon.com/cloudfront/)

---

**Note**: This integration is specifically for Post-Act Report documents. For image uploads (profiles, branding, news, programs), see [Cloudinary Integration Guide](./CLOUDINARY_INTEGRATION_GUIDE.md).

