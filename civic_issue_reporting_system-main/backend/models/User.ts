import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  id: { type: String, unique: true },
  fullName: { type: String },
  mobileNumber: { type: String, unique: true, sparse: true },
  username: { type: String, unique: true, sparse: true },
  email: { type: String, unique: true, sparse: true },
  password: { type: String },
  address: { type: String },
  city: { type: String },
  postalCode: { type: String },
  locationAddress: { type: String },
  latitude: { type: Number },
  longitude: { type: Number },
  reputationPoints: { type: Number, default: 0 },
  badges: { type: [String], default: [] },
  role: { type: String, default: 'citizen' },
  reportedIssuesCount: { type: Number, default: 0 },
  isBlocked: { type: Number, default: 0 }
});

export const User = mongoose.models.User || mongoose.model('User', userSchema);
