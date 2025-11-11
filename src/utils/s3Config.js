import { S3Client } from '@aws-sdk/client-s3';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Configure S3 client
// First try with the configured region, but we'll detect the actual bucket region if needed
let detectedRegion = process.env.AWS_REGION || 'us-east-1';

// Create initial S3 client (will be updated if we detect a different region)
export let s3Client = new S3Client({
  region: detectedRegion,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

export const S3_BUCKET_NAME = process.env.AWS_S3_BUCKET_NAME;
export let AWS_REGION = detectedRegion;
export const CLOUDFRONT_URL = process.env.AWS_CLOUDFRONT_URL; // Optional

// Function to detect and update to the correct bucket region
export const detectBucketRegion = async () => {
  if (!S3_BUCKET_NAME) return detectedRegion;
  
  try {
    const { GetBucketLocationCommand } = await import('@aws-sdk/client-s3');
    // Note: GetBucketLocationCommand might require us-east-1 for some buckets
    // If it fails, we'll try to detect from error response
    try {
      const command = new GetBucketLocationCommand({ Bucket: S3_BUCKET_NAME });
      const response = await s3Client.send(command);
      // GetBucketLocationCommand returns null for us-east-1, or the region string
      const bucketRegion = response.LocationConstraint || 'us-east-1';
      
      if (bucketRegion !== detectedRegion) {
        detectedRegion = bucketRegion;
        AWS_REGION = bucketRegion;
        // Update the S3 client with the correct region
        s3Client = new S3Client({
          region: bucketRegion,
          credentials: {
            accessKeyId: process.env.AWS_ACCESS_KEY_ID,
            secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
          },
        });
        return bucketRegion;
      }
    } catch (locationError) {
      // If GetBucketLocationCommand fails, try to detect from error response
      // Some buckets require us-east-1 to call GetBucketLocationCommand
      if (locationError.$metadata?.httpStatusCode === 301 || 
          locationError.$response?.headers?.['x-amz-bucket-region']) {
        const errorRegion = locationError.$response?.headers?.['x-amz-bucket-region'] || 
                           locationError.$metadata?.extendedRequestId;
        if (errorRegion && errorRegion !== detectedRegion) {
          detectedRegion = errorRegion;
          AWS_REGION = errorRegion;
          s3Client = new S3Client({
            region: errorRegion,
            credentials: {
              accessKeyId: process.env.AWS_ACCESS_KEY_ID,
              secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
            },
          });
          return errorRegion;
        }
      }
      // If we can't detect, keep using the configured region
      return detectedRegion;
    }
  } catch (error) {
    console.error('Error detecting bucket region:', error);
    return detectedRegion;
  }
  
  return detectedRegion;
};

// Folder structure (similar to Cloudinary folders)
export const S3_FOLDERS = {
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
    THUMBNAILS: 'faith-community/programs/thumbnails',
    POST_ACT: 'faith-community/programs/post-act-reports'
  }
};

// Generate S3 URL (or CloudFront URL if configured)
export const getS3Url = (key) => {
  if (CLOUDFRONT_URL) {
    return `${CLOUDFRONT_URL}/${key}`;
  }
  // Use detected region if available, otherwise use configured region
  const region = AWS_REGION || detectedRegion || 'ap-northeast-1';
  return `https://${S3_BUCKET_NAME}.s3.${region}.amazonaws.com/${key}`;
};

// Test S3 connection
export const testS3Connection = async () => {
  try {
    const { ListBucketsCommand } = await import('@aws-sdk/client-s3');
    await s3Client.send(new ListBucketsCommand({}));
    return true;
  } catch (error) {
    console.error('S3 connection failed:', error);
    return false;
  }
};

export default s3Client;

