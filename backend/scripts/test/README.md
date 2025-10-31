# Test Scripts

This directory contains utility test scripts for the FAITH-CommUNITY backend.

## Available Test Scripts

### `test-s3.js`
Tests AWS S3 connection and file upload functionality.

**Usage:**
```bash
cd backend
node scripts/test/test-s3.js
```

**What it tests:**
- Environment variables configuration
- S3 connection
- File upload to S3
- File URL accessibility

**Note:** This script creates a test file in your S3 bucket. The test file can be deleted from the S3 console after testing.

