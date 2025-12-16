// Copy and paste this into your browser console (F12) on your deployed frontend
// Replace YOUR_BACKEND_URL with your actual Railway backend URL
// Replace YOUR_JWT_SECRET with your actual JWT_SECRET from Railway

const backendUrl = 'YOUR_BACKEND_URL'; // Replace with your Railway backend URL
const jwtSecret = 'YOUR_JWT_SECRET'; // Replace with your JWT_SECRET from Railway

console.log('🔧 Initializing superadmin account...');
console.log(`📍 Backend URL: ${backendUrl}`);
console.log('');

fetch(`${backendUrl}/api/superadmin/auth/initialize`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ secretKey: jwtSecret })
})
.then(async (response) => {
  const data = await response.json();
  
  if (response.ok && data.success) {
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
    console.error('');
    console.error('Make sure:');
    console.error('  1. The backend URL is correct');
    console.error('  2. The backend is running and accessible');
    console.error('  3. JWT_SECRET matches your Railway environment variable');
  }
})
.catch(err => {
  console.error('❌ Failed to connect to backend:', err.message);
  console.error('');
  console.error('Make sure:');
  console.error('  1. The backend is running and accessible');
  console.error('  2. BACKEND_URL is set correctly');
  console.error('  3. JWT_SECRET matches your Railway environment variable');
  console.error('');
  console.error('Current BACKEND_URL:', backendUrl);
});