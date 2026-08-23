import { Notification } from '../models/Notification.js';

export async function sendNotification(recipient: string, title: string, message: string, issueId?: string) {
  try {
    const id = Math.random().toString(36).substr(2, 9);
    const timestamp = new Date().toISOString();

    await Notification.create({
      id,
      recipientRole: recipient,
      title,
      message,
      issueId,
      timestamp
    });

    console.log(`🔔 NOTIFICATION SENT to [${recipient}]: ${title} - ${message}`);
    
    // In a real production app, this is where you would call:
    // - Twilio API for SMS
    // - SendGrid API for Email
    // - Firebase Cloud Messaging for Push Notifications
    
    return true;
  } catch (err) {
    console.error("Failed to send notification:", err);
    return false;
  }
}
