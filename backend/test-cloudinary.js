import { testCloudinaryConnection } from './back_end/utils/cloudinaryConfig.js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function testCloudinary() {
  console.log('🧪 Testing Cloudinary Integration...\n');
  
  // Check environment variables
  console.log('📋 Environment Variables:');
  console.log('CLOUDINARY_CLOUD_NAME:', process.env.CLOUDINARY_CLOUD_NAME ? '✅ Set' : '❌ Missing');
  console.log('CLOUDINARY_API_KEY:', process.env.CLOUDINARY_API_KEY ? '✅ Set' : '❌ Missing');
  console.log('CLOUDINARY_API_SECRET:', process.env.CLOUDINARY_API_SECRET ? '✅ Set' : '❌ Missing');
  console.log('');
  
  if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
    console.log('❌ Missing required Cloudinary environment variables!');
    console.log('Please ensure your .env file contains:');
    console.log('CLOUDINARY_CLOUD_NAME=your_cloud_name');
    console.log('CLOUDINARY_API_KEY=your_api_key');
    console.log('CLOUDINARY_API_SECRET=your_api_secret');
    return;
  }
  
  // Test connection
  console.log('🔗 Testing Cloudinary Connection...');
  const isConnected = await testCloudinaryConnection();
  
  if (isConnected) {
    console.log('✅ Cloudinary integration is working correctly!');
    console.log('\n📝 Next Steps:');
    console.log('1. Start your backend server: npm run dev');
    console.log('2. Test file uploads through your API endpoints');
    console.log('3. Check your Cloudinary dashboard to see uploaded files');
    console.log('4. Verify image URLs are using Cloudinary CDN');
    console.log('\n📁 File Storage:');
    console.log('- All images are now stored in Cloudinary');
    console.log('- The backend/uploads/ directory has been removed');
    console.log('- See docs/UPLOADS_MIGRATION_PLAN.md for cleanup details');
  } else {
    console.log('❌ Cloudinary connection failed!');
    console.log('Please check your credentials and try again.');
  }
}

testCloudinary().catch(console.error);
