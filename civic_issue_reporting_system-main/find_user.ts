import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config({ path: 'e:/civ/civic_issue_reporting_system/.env' });

const userSchema = new mongoose.Schema({}, { strict: false });
const User = mongoose.model('User', userSchema, 'users');

async function test() {
  await mongoose.connect(process.env.LOCAL_MONGODB_URI || 'mongodb://127.0.0.1:27017/civic_issue');
  const user = await User.findOne({ username: 'admin' });
  console.log('Result of findOne:', user);
  process.exit(0);
}
test();
