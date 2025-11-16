import fetch from 'node-fetch';

const API_URL = process.env.API_BASE_URL || 'http://localhost:8080';

async function testSuperadminLogin() {
  try {
    console.log('Testing superadmin login endpoint...\n');
    console.log('URL:', `${API_URL}/api/superadmin/auth/login`);
    
    const response = await fetch(`${API_URL}/api/superadmin/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'faithcommunityfaces@gmail.com',
        password: 'admin123'
      })
    });
    
    const data = await response.json();
    
    console.log('='.repeat(60));
    console.log('RESPONSE STATUS:', response.status);
    console.log('='.repeat(60));
    console.log('RESPONSE BODY:');
    console.log(JSON.stringify(data, null, 2));
    
    if (response.status === 401) {
      console.log('\n❌ Login failed with 401 Unauthorized');
      console.log('Error:', data.error);
      if (data.attempts !== undefined) {
        console.log('Failed attempts:', data.attempts);
        console.log('Remaining attempts:', data.remainingAttempts);
      }
    } else if (response.status === 200) {
      console.log('\n✅ Login successful!');
      console.log('Token received:', data.token ? 'Yes' : 'No');
    } else {
      console.log('\n⚠️  Unexpected status code:', response.status);
    }
    
  } catch (error) {
    console.error('❌ Error testing login:', error.message);
    if (error.code === 'ECONNREFUSED') {
      console.error('⚠️  Backend server is not running on', API_URL);
    }
  }
}

testSuperadminLogin();

