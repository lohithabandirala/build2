import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema({
  id: { type: String, unique: true },
  recipientRole: { type: String }, // e.g., 'admin', 'team-001'
  title: { type: String },
  message: { type: String },
  issueId: { type: String },
  isRead: { type: Boolean, default: false },
  timestamp: { type: String }
});

export const Notification = mongoose.models.Notification || mongoose.model('Notification', notificationSchema);
