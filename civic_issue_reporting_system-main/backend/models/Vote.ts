import mongoose from 'mongoose';

const voteSchema = new mongoose.Schema({
  id: { type: String, unique: true },
  issueId: { type: String },
  userId: { type: String },
  vote: { type: String },
  comment: { type: String },
  proofImage: { type: String },
  timestamp: { type: String }
});

export const Vote = mongoose.models.Vote || mongoose.model('Vote', voteSchema);
