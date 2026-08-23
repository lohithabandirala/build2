import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
dotenv.config({ path: 'e:/civ/civic_issue_reporting_system/.env' });

const userSchema = new mongoose.Schema({}, { strict: false });
const User = mongoose.model('User', userSchema, 'users');

async function test() {
  await mongoose.connect(process.env.LOCAL_MONGODB_URI || 'mongodb://127.0.0.1:27017/civic_issue');
  const password = 'admin';
  const hashedPassword = await bcrypt.hash(password, 10);
  
  const existing = await User.findOne({ username: 'admin' });
  if (existing) {
    await User.updateOne({ username: 'admin' }, { $set: { password: hashedPassword, role: 'admin' } });
    console.log('Password updated for existing admin.');
  } else {
    await User.create({
      id: 'admin_123',
      username: 'admin',
      email: 'admin@civic.gov',
      password: hashedPassword,
      role: 'admin'
    });
    console.log('Created admin user in local DB.');
  }
  process.exit(0);
}
test();
