import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

async function testConnection() {
  const uri = process.env.MONGODB_URI;
  console.log("🔍 Attempting to connect to MongoDB Atlas...");
  
  if (!uri || uri.includes("127.0.0.1")) {
    console.error("❌ Error: MONGODB_URI is missing or still set to localhost.");
    return;
  }

  try {
    await mongoose.connect(uri);
    console.log("✅ SUCCESS! Connected to MongoDB Atlas.");
    console.log("📡 Host:", mongoose.connection.host);
    console.log("📂 Database:", mongoose.connection.name);
    
    // Check if we can perform a simple operation
    const collections = await mongoose.connection.db?.listCollections().toArray();
    console.log("📑 Collections found:", collections?.map(c => c.name));
    
    await mongoose.disconnect();
    console.log("👋 Disconnected cleanly.");
  } catch (err: any) {
    console.error("❌ CONNECTION FAILED!");
    console.error("Error Message:", err.message);
    console.log("\n💡 Common Fixes:");
    console.log("1. Check if your password is correct in the URI.");
    console.log("2. Ensure 'Allow access from anywhere (0.0.0.0/0)' is enabled in Atlas Network Access.");
    console.log("3. Make sure there are no special characters in your password (like @, #, etc.) that aren't URL-encoded.");
  }
}

testConnection();
