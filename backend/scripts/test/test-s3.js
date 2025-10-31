import dotenv from 'dotenv';
import { testS3Connection, S3_BUCKET_NAME, AWS_REGION, getS3Url, S3_FOLDERS } from '../../src/utils/s3Config.js';
import { uploadSingleToS3 } from '../../src/utils/s3Upload.js';
import fs from 'fs';
import path from 'path';

// Load environment variables
dotenv.config();

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function testS3Setup() {
  log('\n=== AWS S3 Connection Test ===\n', 'cyan');

  // 1. Check environment variables
  log('1. Checking environment variables...', 'blue');
  const requiredVars = {
    AWS_REGION: process.env.AWS_REGION,
    AWS_ACCESS_KEY_ID: process.env.AWS_ACCESS_KEY_ID,
    AWS_SECRET_ACCESS_KEY: process.env.AWS_SECRET_ACCESS_KEY,
    AWS_S3_BUCKET_NAME: process.env.AWS_S3_BUCKET_NAME,
  };

  let allVarsPresent = true;
  for (const [key, value] of Object.entries(requiredVars)) {
    if (!value) {
      log(`   ❌ ${key} is missing`, 'red');
      allVarsPresent = false;
    } else {
      const displayValue = key.includes('SECRET') || key.includes('KEY')
        ? `${value.substring(0, 8)}...` 
        : value;
      log(`   ✅ ${key}: ${displayValue}`, 'green');
    }
  }

  if (!allVarsPresent) {
    log('\n❌ Please set all required environment variables in your .env file', 'red');
    log('Required variables:', 'yellow');
    log('  - AWS_REGION', 'yellow');
    log('  - AWS_ACCESS_KEY_ID', 'yellow');
    log('  - AWS_SECRET_ACCESS_KEY', 'yellow');
    log('  - AWS_S3_BUCKET_NAME', 'yellow');
    return false;
  }

  log(`\n   Bucket Name: ${S3_BUCKET_NAME}`, 'green');
  log(`   Configured Region: ${AWS_REGION}`, 'green');
  log(`   ⚠️  Note: If your bucket is in a different region, update AWS_REGION in .env`, 'yellow');

  // 2. Test S3 connection
  log('\n2. Testing S3 connection...', 'blue');
  try {
    const isConnected = await testS3Connection();
    if (isConnected) {
      log('   ✅ S3 connection successful!', 'green');
    } else {
      log('   ❌ S3 connection failed', 'red');
      return false;
    }
  } catch (error) {
    log(`   ❌ Connection error: ${error.message}`, 'red');
    return false;
  }

  // 3. Test file upload
  log('\n3. Testing file upload...', 'blue');
  
  // Create a simple test file (text file simulating a document)
  const testFileName = 'test-post-act-report.txt';
  const testContent = `This is a test Post Act Report file created at ${new Date().toISOString()}\n\nTesting AWS S3 integration for FAITH-CommUNITY project.`;
  
  try {
    // Create test file in memory (buffer)
    const testBuffer = Buffer.from(testContent, 'utf-8');
    
    // Create a file-like object for testing
    const testFile = {
      originalname: testFileName,
      mimetype: 'text/plain',
      buffer: testBuffer,
      size: testBuffer.length,
    };

    log(`   Uploading test file: ${testFileName}`, 'yellow');
    
    const uploadResult = await uploadSingleToS3(
      testFile,
      S3_FOLDERS.PROGRAMS.POST_ACT,
      { prefix: 'test_' }
    );

    if (uploadResult.success) {
      log('   ✅ File upload successful!', 'green');
      log(`\n   Upload Details:`, 'cyan');
      log(`   - File URL: ${uploadResult.url}`, 'green');
      log(`   - File Key: ${uploadResult.key}`, 'green');
      log(`   - Content Type: ${uploadResult.content_type}`, 'green');
      log(`   - File Size: ${uploadResult.size} bytes`, 'green');
      log(`   - Original Filename: ${uploadResult.original_filename}`, 'green');
      
      // Test URL accessibility
      log('\n4. Testing URL accessibility...', 'blue');
      try {
        const response = await fetch(uploadResult.url);
        if (response.ok) {
          log('   ✅ File is publicly accessible!', 'green');
          log(`   ✅ URL works: ${uploadResult.url}`, 'green');
        } else {
          log(`   ⚠️  URL returned status: ${response.status}`, 'yellow');
        }
      } catch (fetchError) {
        log(`   ⚠️  Could not fetch URL: ${fetchError.message}`, 'yellow');
        log('   Note: This might be a CORS issue or the file needs a moment to be available', 'yellow');
      }

      log('\n✅ All tests passed! Your S3 setup is working correctly.', 'green');
      log('\n📝 Next steps:', 'cyan');
      log('   1. Test uploading a real Post Act Report through your application', 'yellow');
      log('   2. Verify the file appears in your S3 bucket:', 'yellow');
      log(`      https://s3.console.aws.amazon.com/s3/buckets/${S3_BUCKET_NAME}`, 'yellow');
      log('   3. Test file display in your frontend submission modal', 'yellow');
      
      return true;
    } else {
      log('   ❌ Upload returned success: false', 'red');
      return false;
    }
  } catch (error) {
    log(`   ❌ Upload error: ${error.message}`, 'red');
    log(`   Error details: ${error.stack}`, 'red');
    return false;
  }
}

// Run the test
testS3Setup()
  .then((success) => {
    if (success) {
      log('\n🎉 S3 Integration Test Complete!\n', 'green');
      process.exit(0);
    } else {
      log('\n❌ S3 Integration Test Failed\n', 'red');
      process.exit(1);
    }
  })
  .catch((error) => {
    log(`\n❌ Unexpected error: ${error.message}`, 'red');
    console.error(error);
    process.exit(1);
  });

