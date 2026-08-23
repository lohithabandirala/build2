import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config({ path: 'e:/civ/civic_issue_reporting_system/.env' });

const userSchema = new mongoose.Schema({}, { strict: false });
const User = mongoose.model('User', userSchema, 'users');

async function test() {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/civic_issue');
  const allUsers = await User.find({});
  console.log('Total users:', allUsers.length);
  for (const u of allUsers) {
    console.log(`- Username: '${u.get('username')}', Role: '${u.get('role')}', Email: '${u.get('email')}'`);
  }
  process.exit(0);
}
test();
