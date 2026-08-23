import http from 'http';

const testOTP = async () => {
  console.log("1. Sending OTP to test@example.com...");
  
  const sendRes = await fetch('http://localhost:3000/api/send-email-otp', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'test@example.com' })
  });
  
  const sendData = await sendRes.json();
  console.log("Send OTP Response:", sendData);
  
  console.log("\n2. Attempting to login with universal OTP 123456...");
  
  const loginRes = await fetch('http://localhost:3000/api/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'test@example.com', otp: '123456' })
  });
  
  const loginData = await loginRes.json();
  console.log("Login Response:");
  console.log(loginData);
  
  if (loginData.token) {
    console.log("✅ LOGIN SUCCESS! Token received.");
  } else if (loginData.error === 'User not found. Please register.') {
    console.log("⚠️ User not found. This is EXPECTED for a new email! Attempting registration...");
    
    const regRes = await fetch('http://localhost:3000/api/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        fullName: 'Test User',
        email: 'test@example.com', 
        address: '123 Test St',
        city: 'Testville',
        postalCode: '12345',
        otp: '123456' 
      })
    });
    
    const regData = await regRes.json();
    console.log("Registration Response:", regData);
    if (regData.token) {
      console.log("✅ REGISTRATION SUCCESS! Token received.");
    } else {
      console.log("❌ REGISTRATION FAILED.");
    }
  }
};

testOTP();
