import axios from 'axios';

async function testRegister() {
  try {
    const res = await axios.post('http://localhost:3000/api/register', {
      username: 'testuser' + Date.now(),
      email: 'test' + Date.now() + '@example.com',
      password: 'password123'
    });
    console.log('✅ Success:', res.data);
  } catch (err: any) {
    console.error('❌ Error:', err.response?.data || err.message);
  }
}

testRegister();
