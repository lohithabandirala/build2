import mongoose, { Document, Schema } from 'mongoose';

export interface IIssue extends Document {
  id: string;
  userId?: string;
  username?: string;
  category: string;
  text: string;
  imageUrl?: string;
  location?: { lat: number, lng: number };
  status: string; // 'Open', 'In Progress', 'Resolved', 'Closed'
  ai_analysis?: any;
  upvotes: number;
  votedBy: string[]; // User IDs
  createdAt: string;
  isFake?: number; // 0 or 1
  fakeReason?: string;
  assignedTeam?: string;
  adminNotes?: string;
  communityVotes?: {
    userId: string;
    username: string;
    vote: string;
    comment: string;
    timestamp: string;
  }[];
}

const IssueSchema: Schema = new Schema({
  id: { type: String, required: true, unique: true },
  userId: { type: String },
  username: { type: String, default: 'Anonymous Citizen' },
  category: { type: String, required: true },
  text: { type: String, required: true },
  imageUrl: { type: String },
  location: { 
    lat: { type: Number },
    lng: { type: Number }
  },
  locationName: { type: String },
  status: { type: String, default: 'Open' },
  ai_analysis: { type: Schema.Types.Mixed },
  upvotes: { type: Number, default: 0 },
  votedBy: [{ type: String }],
  createdAt: { type: String, required: true },
  isFake: { type: Number, default: 0 },
  fakeReason: { type: String },
  assignedTeam: { type: String },
  adminNotes: { type: String },
  communityVotes: [{
    userId: String,
    username: String,
    vote: String,
    comment: String,
    timestamp: String
  }]
}, { timestamps: true });

export const Issue = mongoose.models.Issue || mongoose.model<IIssue>('Issue', IssueSchema);
