import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: 'e:/civ/civic_issue_reporting_system/.env' });

const issueSchema = new mongoose.Schema({}, { strict: false });
const Issue = mongoose.model('Issue', issueSchema, 'issues');

async function test() {
  await mongoose.connect(process.env.MONGO_URI || '');
  console.log('Connected to DB');
  
  const issues = await Issue.find({ status: { $in: ['Pending', 'Assigned'] } });
  console.log(`Found ${issues.length} Pending/Assigned issues.`);
  
  const criticals = await Issue.find({ priority: 'Emergency' });
  console.log(`Found ${criticals.length} Emergency issues.`);
  
  if (criticals.length > 0) {
    console.log('Sample Emergency issue adminNotes:', criticals[0].get('adminNotes'));
  }
  
  process.exit(0);
}
test();
