import mongoose, { Document, Schema } from 'mongoose';

export interface IUser extends Document {
  id: string;
  username: string;
  email?: string;
  role: string; // 'citizen', 'admin'
  reputationPoints: number;
  badges: string[];
}

const UserSchema: Schema = new Schema({
  id: { type: String, required: true, unique: true },
  username: { type: String, required: true },
  email: { type: String },
  role: { type: String, default: 'citizen' },
  reputationPoints: { type: Number, default: 0 },
  badges: [{ type: String }]
}, { timestamps: true });

export const User = mongoose.models.User || mongoose.model<IUser>('User', UserSchema);
