import http from 'http';

const testLogin = async () => {
  console.log("Attempting to login with universal OTP 123456...");
  
  const loginRes = await fetch('http://localhost:3000/api/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'test@example.com', otp: '123456' })
  });
  
  const loginData = await loginRes.json();
  console.log("Login Response:", loginData);
  if (loginData.token) {
    console.log("✅ LOGIN SUCCESS!");
  } else {
    console.log("❌ LOGIN FAILED.");
  }
}
testLogin();
