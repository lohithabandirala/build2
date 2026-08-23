import mongoose from 'mongoose';

const issueSchema = new mongoose.Schema({
  id: { type: String, unique: true },
  userId: { type: String },
  username: { type: String },
  category: { type: String },
  description: { type: String },
  imageUrl: { type: String },
  locationAddress: { type: String },
  latitude: { type: Number },
  longitude: { type: Number },
  priority: { type: String },
  status: { type: String },
  timestamp: { type: String },
  upvotes: { type: Number, default: 0 },
  votedBy: { type: [String], default: [] },
  voteCountResolved: { type: Number, default: 0 },
  voteCountNotResolved: { type: Number, default: 0 },
  citizenVerification: { type: Object, default: null },
  communityVotes: { type: [Object], default: [] },
  assignedTeam: { type: String },
  workerImageUrl: { type: String },
  resolutionImage: { type: String },
  adminNotes: { type: String },
  isFake: { type: Number, default: 0 },
  resolvedAt: { type: String },
  proofImageUrl: { type: String },
  isDuplicate: { type: Boolean, default: false },
  duplicateOf: { type: String },
  division: { type: String },
  prabhag: { type: String },
  userEmail: { type: String },
  // AI Analysis results stored on the issue
  aiAnalysis: { type: Object, default: null },
  // Image analysis
  imageDescription: { type: String },
  imageTextMatch: { type: Boolean },
  imageTextCoherenceScore: { type: Number },
  overallTrustScore: { type: Number },
});

export const Issue = mongoose.models.Issue || mongoose.model('Issue', issueSchema);
