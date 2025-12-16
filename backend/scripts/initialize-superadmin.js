/**
 * Initialize Superadmin Account
 * 
 * This script calls the initialization endpoint to update the superadmin account
 * with credentials from environment variables.
 * 
 * Usage:
 *   node scripts/initialize-superadmin.js
 * 
 * Or with custom URL:
 *   BACKEND_URL=https://your-backend.railway.app node scripts/initialize-superadmin.js
 */

// Using built-in fetch (available in Node.js 18+)
// The backend requires Node >=20.0.0, so fetch is available

const BACKEND_URL = process.env.BACKEND_URL || process.env.RAILWAY_PUBLIC_DOMAIN || 'http://localhost:8080';
const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  console.error('❌ ERROR: JWT_SECRET environment variable is required');
  console.error('');
  console.error('Please set JWT_SECRET before running this script:');
  console.error('  JWT_SECRET=your-secret node scripts/initialize-superadmin.js');
  console.error('');
  console.error('Or set it in your .env file or Railway environment variables');
  process.exit(1);
}

const url = `${BACKEND_URL}/api/superadmin/auth/initialize`;

console.log('🔧 Initializing superadmin account...');
console.log(`📍 Backend URL: ${BACKEND_URL}`);
console.log('');

try {
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      secretKey: JWT_SECRET
    })
  });

  const data = await response.json();

  if (response.ok) {
    console.log('✅ Success!');
    console.log('');
    console.log('Superadmin account initialized:');
    console.log(`  📧 Email: ${data.email}`);
    console.log(`  🔑 Password: ${data.password}`);
    console.log('');
    console.log('⚠️  ' + data.warning);
    console.log('💡 ' + data.note);
    console.log('');
    console.log('You can now log in with these credentials.');
  } else {
    console.error('❌ Error:', data.error || 'Unknown error');
    console.error('');
    console.error('Response status:', response.status);
    if (data.error) {
      console.error('Error details:', data.error);
    }
    process.exit(1);
  }
} catch (error) {
  console.error('❌ Failed to connect to backend:', error.message);
  console.error('');
  console.error('Make sure:');
  console.error('  1. The backend is running and accessible');
  console.error('  2. BACKEND_URL is set correctly');
  console.error('  3. JWT_SECRET matches your Railway environment variable');
  console.error('');
  console.error('Current BACKEND_URL:', BACKEND_URL);
  process.exit(1);
}

