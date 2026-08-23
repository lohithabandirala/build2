import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config({ path: 'e:/civ/civic_issue_reporting_system/.env' });

const userSchema = new mongoose.Schema({}, { strict: false });
const User = mongoose.model('User', userSchema, 'users');

async function test() {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/civic_issue');
  const admins = await User.find({ role: 'admin' });
  if (admins.length > 0) {
    console.log('Admin username:', admins[0].get('username'));
    console.log('Admin email:', admins[0].get('email'));
    console.log('Password hash:', admins[0].get('password'));
  } else {
    console.log('No admin found.');
  }
  process.exit(0);
}
test();
