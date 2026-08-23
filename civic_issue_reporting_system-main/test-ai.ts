import { analyzeIssue } from './backend/services/ai';
import dotenv from 'dotenv';

dotenv.config();

async function testAI() {
  console.log("🧪 Testing AI Analysis...");
  console.log("Description: 'There is a huge pothole in the middle of the road near the school. It is very dangerous for kids.'");
  
  const result = await analyzeIssue("There is a huge pothole in the middle of the road near the school. It is very dangerous for kids.");
  
  if (result) {
    console.log("✅ AI Response Received:");
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.log("❌ AI Analysis Failed (Check your GEMINI_API_KEY)");
  }
}

testAI();
