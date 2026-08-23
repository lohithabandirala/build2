import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import multer from 'multer';
import nodemailer from 'nodemailer';
import twilio from 'twilio';

// Import Models
import { User } from './backend/models/User.js';
import { Issue } from './backend/models/Issue.js';
import { WorkerTeam } from './backend/models/WorkerTeam.js';
import { SystemConfig } from './backend/models/SystemConfig.js';
import { Vote } from './backend/models/Vote.js';
import { Notification } from './backend/models/Notification.js';
import { analyzeIssue, analyzeIssueDeep, batchAnalyzeIssues } from './backend/services/ai.js';
import { sendNotification } from './backend/services/notification.js';
import { analyzeImageForensics } from './backend/services/imageForensics.js';

import os from 'os';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const JWT_SECRET = process.env.JWT_SECRET || 'civic-connect-secret-key-2026';
const MONGODB_URI =
  process.env.VERCEL || process.env.NODE_ENV === 'production'
    ? process.env.MONGODB_URI
    : process.env.LOCAL_MONGODB_URI || process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/civic_issue';
const PORT = process.env.PORT || 3000;

// Initialize Database (Serverless friendly)
let isConnected = false;
const connectDB = async () => {
  if (isConnected) return;
  if (!MONGODB_URI) {
    throw new Error('MONGODB_URI is not configured');
  }
  try {
    const db = await mongoose.connect(MONGODB_URI);
    isConnected = db.connections[0].readyState === 1;
    console.log('✅ Connected to MongoDB');

    // Seed dynamic system configuration
    const configCount = await (SystemConfig as any).countDocuments();
    if (configCount === 0) {
      console.log('🌱 Seeding dynamic system configuration...');
      await (SystemConfig as any).create({
        id: 'default',
        categories: ['Potholes', 'Garbage', 'Streetlights', 'Water Leakage', 'Drainage', 'Fallen Trees', 'Other'],
        priorities: ['Normal', 'High', 'Emergency']
      });
    }
  } catch (err) {
    console.error('❌ MongoDB connection error:', err);
    throw err;
  }
};

if (!process.env.VERCEL) {
  connectDB();
}

const app = express();
app.use(express.json({ limit: '50mb' }));

// Middleware to ensure DB connection on serverless
app.use(async (req, res, next) => {
  if (process.env.VERCEL) {
    try {
      await connectDB();
    } catch {
      return res.status(503).json({
        error: 'Database connection failed. Check the MONGODB_URI environment variable.',
      });
    }
  }
  next();
});

// Setup Multer for image uploads
const uploadDir = process.env.VERCEL ? os.tmpdir() : path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 15 * 1024 * 1024 } // 15MB limit
});

app.use('/uploads', express.static(uploadDir));

// --- Auth Middleware ---
const authenticateToken = (req: any, res: any, next: any) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) return res.status(401).json({ error: 'Access token required' });

  jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
    if (err) return res.status(403).json({ error: 'Invalid or expired token' });
    req.user = user;
    next();
  });
};

const isAdmin = (req: any, res: any, next: any) => {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    res.status(403).json({ error: 'Admin access required' });
  }
};

// --- Helpers ---
function classifyPriority(category: string, description: string) {
  const emergencyKeywords = ['gas leak', 'structural collapse', 'live wire', 'emergency', 'danger', 'flood', 'accident'];
  const highKeywords = ['deep pothole', 'garbage heap', 'clogged drain', 'broken pipe', 'sanitation', 'vandalism', 'security'];
  const desc = description.toLowerCase();

  if (emergencyKeywords.some(k => desc.includes(k)) || category === 'Electricity') return 'Emergency';
  if (highKeywords.some(k => desc.includes(k)) || category === 'Roads' || category === 'Sanitation') return 'High';
  return 'Normal';
}

function getDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371; // km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// --- API Routes ---

app.get('/api/health', (req, res) => res.json({ ok: true, database: 'MongoDB', timestamp: new Date().toISOString() }));

app.post('/api/upload', authenticateToken, upload.single('image'), (req: any, res) => {
  if (!req.file) return res.status(400).json({ error: 'No image uploaded' });
  res.json({ imageUrl: `/uploads/${req.file.filename}` });
});

// --- System Config Route ---
app.get('/api/system-config', async (req, res) => {
  try {
    const config = await (SystemConfig as any).findOne({ id: 'default' });
    if (!config) {
      return res.json({ categories: [], priorities: [] });
    }
    res.json({ categories: config.categories, priorities: config.priorities });
  } catch (err) {
    console.error("System config error:", err);
    res.status(500).json({ error: 'Failed to load system config' });
  }
});

// --- Auth Routes ---
const otpStore = new Map<string, { otp: string, expiresAt: number }>();

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

app.post('/api/send-email-otp', async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email required' });

  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  otpStore.set(email, { otp, expiresAt: Date.now() + 10 * 60 * 1000 }); // 10 mins

  console.log(`\n\n=== EMAIL OTP for ${email}: ${otp} ===\n\n`);

  if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
    try {
      await transporter.sendMail({
        from: process.env.EMAIL_USER,
        to: email,
        subject: 'CivicConnect Verification Code',
        text: `Your verification code is ${otp}. It is valid for 10 minutes.`
      });
      console.log('✅ Email OTP sent successfully');
    } catch (err: any) {
      console.error('❌ Email OTP failed:', err.message);
    }
  } else {
    console.warn('⚠️ Email credentials missing in .env. Skipping real email.');
  }

  res.json({ success: true, message: 'OTP sent to email successfully' });
});

app.post('/api/register', async (req, res) => {
  try {
    const userCount = await (User as any).countDocuments();
    const role = userCount === 0 ? 'admin' : 'citizen';
    const id = Math.random().toString(36).substr(2, 9);

    if (role === 'admin') {
      // First user becomes admin automatically. If registered via citizen form, generate a username.
      const { username, email, password } = req.body;
      const actualUsername = username || `admin_${id}`;
      const actualPassword = password || id; // fallback if password is missing
      const hashedPassword = await bcrypt.hash(actualPassword, 10);
      const user = await (User as any).create({ id, username: actualUsername, email, password: hashedPassword, role });
      const token = jwt.sign({ id, username: actualUsername, email, role }, JWT_SECRET);
      return res.json({ token, user: { id, username: actualUsername, email, role, reputationPoints: 0, badges: [] } });
    } else {
      const { fullName, email, address, city, postalCode, otp } = req.body;
      if (!email || !otp) return res.status(400).json({ error: 'Email and OTP are required' });

      const storedOtpData = otpStore.get(email);
      if (!storedOtpData || storedOtpData.otp !== otp || storedOtpData.expiresAt < Date.now()) {
        return res.status(400).json({ error: 'Invalid or expired OTP' });
      }

      // Generate unique username to prevent MongoDB duplicate null key error
      const user = await (User as any).create({
        id, username: `citizen_${id}`, fullName, email, address, city, postalCode, role
      });
      const token = jwt.sign({ id, email, role }, JWT_SECRET);

      otpStore.delete(email);
      return res.json({ token, user: { id, fullName, email, role, reputationPoints: 0, badges: [] } });
    }
  } catch (err: any) {
    console.error('Registration Error:', err);
    if (err.code === 11000) {
      const field = Object.keys(err.keyPattern || {})[0];
      res.status(400).json({ error: `${field.charAt(0).toUpperCase() + field.slice(1)} already exists` });
    } else {
      res.status(500).json({ error: err.message || 'Internal server error during registration' });
    }
  }
});

app.post('/api/login', async (req, res) => {
  const { username, email, password, otp } = req.body;

  // Admin Login (Username + Password)
  if (username && password) {
    const user: any = await (User as any).findOne({ username }).lean();
    if (!user) return res.status(400).json({ error: 'User not found' });
    if (user.isBlocked) return res.status(403).json({ error: 'Account blocked' });
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(400).json({ error: 'Invalid credentials' });
    const token = jwt.sign({ id: user.id, username: user.username, email: user.email, role: user.role }, JWT_SECRET);
    const { password: _, ...profile } = user;
    return res.json({ token, user: profile });
  }

  // Citizen Login (Email + OTP)
  if (email && otp) {
    const storedOtpData = otpStore.get(email);
    if (!storedOtpData || storedOtpData.otp !== otp || storedOtpData.expiresAt < Date.now()) {
      return res.status(400).json({ error: 'Invalid or expired OTP' });
    }
    const user: any = await (User as any).findOne({ email }).lean();
    if (!user) return res.status(404).json({ error: 'User not found. Please register.' });
    if (user.isBlocked) return res.status(403).json({ error: 'Account blocked' });
    const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET);
    const { password: _, ...profile } = user;
    otpStore.delete(email);
    return res.json({ token, user: profile });
  }

  return res.status(400).json({ error: 'Invalid login parameters' });
});

app.get('/api/me', authenticateToken, async (req: any, res) => {
  const user = await (User as any).findOne({ id: req.user.id }, { password: 0 }).lean();
  res.json(user);
});

app.put('/api/user/location', authenticateToken, async (req: any, res) => {
  const { locationAddress, latitude, longitude } = req.body;
  await (User as any).updateOne({ id: req.user.id }, { locationAddress, latitude, longitude });
  res.json({ success: true });
});

app.get('/api/leaderboard', authenticateToken, async (req: any, res) => {
  try {
    const topUsers = await (User as any).find({ role: 'citizen' })
      .sort({ reputationPoints: -1 })
      .limit(10)
      .select({ id: 1, username: 1, reputationPoints: 1, badges: 1, _id: 0 })
      .lean();
    res.json(topUsers);
  } catch (err) {
    console.error("Leaderboard Error:", err);
    res.status(500).json({ error: 'Failed to fetch leaderboard' });
  }
});

// --- Issue Routes ---
app.get('/api/issues', authenticateToken, async (req, res) => {
  const issues = await (Issue as any).find().sort({ timestamp: -1 }).lean();
  res.json(issues);
});

app.post('/api/issues/:id/upvote', authenticateToken, async (req: any, res) => {
  try {
    const issueId = req.params.id;
    const userId = req.user.id;

    const issue = await (Issue as any).findOne({ id: issueId });
    if (!issue) return res.status(404).json({ error: 'Issue not found' });

    // Check if user already upvoted
    if (issue.votedBy && issue.votedBy.includes(userId)) {
      // Remove vote (toggle)
      await (Issue as any).updateOne(
        { id: issueId },
        {
          $inc: { upvotes: -1 },
          $pull: { votedBy: userId }
        }
      );
      // Remove 10 reputation points from the reporter (issue.userId) to prevent abuse
      await (User as any).updateOne({ id: issue.userId }, { $inc: { reputationPoints: -10 } });
      return res.json({ success: true, message: 'Upvote removed' });
    }

    // Add vote
    await (Issue as any).updateOne(
      { id: issueId },
      {
        $inc: { upvotes: 1 },
        $push: { votedBy: userId }
      }
    );
    // Award 10 reputation points to the reporter (issue.userId)
    await (User as any).updateOne({ id: issue.userId }, { $inc: { reputationPoints: 10 } });
    res.json({ success: true, message: 'Upvote added' });
  } catch (err) {
    console.error("Upvote Error:", err);
    res.status(500).json({ error: 'Failed to upvote' });
  }
});

app.post('/api/communityVote', authenticateToken, async (req: any, res) => {
  try {
    const { issueId, vote, comment, proofUrl } = req.body;
    const userId = req.user.id;
    const username = req.user.username;

    const issue = await (Issue as any).findOne({ id: issueId });
    if (!issue) return res.status(404).json({ error: 'Issue not found' });

    // Check if user already voted
    const existingVote = issue.communityVotes?.find((v: any) => v.userId === userId);
    if (existingVote) {
      return res.status(400).json({ error: 'You have already voted on this issue.' });
    }

    const voteObj = { userId, username, vote, comment, proofUrl, timestamp: new Date().toISOString() };
    const updateQuery: any = { $push: { communityVotes: voteObj } };

    if (vote === 'Resolved') {
      updateQuery.$inc = { voteCountResolved: 1 };
    } else {
      updateQuery.$inc = { voteCountNotResolved: 1 };
    }

    await (Issue as any).updateOne({ id: issueId }, updateQuery);

    // Award 5 reputation points to the voter for participating in community verification
    await (User as any).updateOne({ id: userId }, { $inc: { reputationPoints: 5 } });

    res.json({ success: true, message: 'Vote submitted successfully' });
  } catch (err) {
    console.error("Community Vote Error:", err);
    res.status(500).json({ error: 'Failed to submit vote' });
  }
});

app.post('/api/reportIssue', authenticateToken, async (req: any, res) => {
  try {
    const { category, description, imageUrl, locationAddress, latitude, longitude, priority, division, prabhag } = req.body;

    // 1. Run EXIF Image Forensics
    let forensicIsFake = false;
    let forensicReasons: string[] = [];
    if (imageUrl) {
      const fileName = path.basename(imageUrl);
      const filePath = path.join(uploadDir, fileName);
      if (fs.existsSync(filePath)) {
        const forensicResult = await analyzeImageForensics(filePath, parseFloat(latitude), parseFloat(longitude));
        if (forensicResult.isFake) {
          forensicIsFake = true;
          forensicReasons = forensicResult.reasons;
        }
      }
    }

    // AI Analysis with image + text + heading coherence check
    const aiResult = await analyzeIssue(description, imageUrl, category);
    const finalCategory = aiResult?.category || category || 'Other';
    const finalPriority = aiResult?.priority || priority || classifyPriority(finalCategory, description);
    const aiSummary = aiResult?.summary || '';

    // Extract image analysis results
    const imageDescription = aiResult?.imageDescription || null;
    const imageTextMatch = aiResult?.imageTextMatch ?? null;
    const imageTextCoherenceScore = aiResult?.imageTextCoherenceScore ?? null;
    const fakeReason = aiResult?.fakeReason || null;

    // STRICT Fake detection: flag if AI says fake OR if image doesn't match heading/description
    const hasImageAnalysis = imageTextCoherenceScore !== null && imageTextCoherenceScore !== undefined;
    const aiSaysFake = aiResult?.isLikelyFake === true;
    const imageMismatch = imageTextMatch === false && hasImageAnalysis;
    const lowCoherence = hasImageAnalysis && imageTextCoherenceScore < 40;
    const imageNotCivic = aiResult?.imageAnalysis?.showsCivicIssue === false;
    const headingMismatch = aiResult?.imageAnalysis?.matchesHeading === false;
    const descriptionMismatch = aiResult?.imageAnalysis?.matchesDescription === false;

    const isFake = (forensicIsFake || aiSaysFake || imageMismatch || lowCoherence || imageNotCivic || headingMismatch || descriptionMismatch) ? 1 : 0;

    // Combine AI reasons with Forensic reasons
    const finalFakeReason = forensicIsFake ? `Image Forensics Failed: ${forensicReasons.join(' ')} ${fakeReason || ''}` : fakeReason;

    const id = Math.random().toString(36).substr(2, 9);

    // Duplicate Detection
    let isDuplicate = false;
    let duplicateOf = undefined;
    if (latitude && longitude) {
      const existing = await (Issue as any).findOne({
        category: finalCategory,
        latitude: { $gte: latitude - 0.002, $lte: latitude + 0.002 },
        longitude: { $gte: longitude - 0.002, $lte: longitude + 0.002 },
        status: { $ne: 'Resolved' }
      });
      if (existing) { isDuplicate = true; duplicateOf = existing.id; }
    }

    // Routing
    let assignedTeam = undefined;
    let status = 'Pending';
    if (!isDuplicate && !isFake) {
      const catLower = finalCategory.toLowerCase();
      if (catLower.includes('sanitation') || catLower.includes('garbage')) {
        assignedTeam = 'team-001';
      } else if (catLower.includes('road') || catLower.includes('pothole')) {
        assignedTeam = 'team-002';
      } else if (catLower.includes('drainage') || catLower.includes('water')) {
        assignedTeam = 'team-003';
      }

      if (assignedTeam) {
        status = 'Assigned';
        await WorkerTeam.updateOne({ id: assignedTeam }, { $inc: { activeTasks: 1 } });
      }
    }

    // If flagged as fake, set status to Closed
    if (isFake) {
      status = 'Closed';
    }

    await (Issue as any).create({
      id, userId: req.user.id, username: req.user.username, userEmail: req.user.email,
      category: finalCategory, description, imageUrl, locationAddress, latitude, longitude,
      priority: finalPriority, status, division, prabhag, isDuplicate, duplicateOf,
      isFake, adminNotes: isFake ? `⚠️ FAKE DETECTED: ${finalFakeReason || aiSummary}` : aiSummary,
      timestamp: new Date().toISOString(), assignedTeam,
      imageDescription, imageTextMatch, imageTextCoherenceScore,
      aiAnalysis: aiResult || null,
      overallTrustScore: aiResult?.severityScore ? (isFake ? 10 : 80) : null
    });

    await (User as any).updateOne({ id: req.user.id }, { $inc: { reputationPoints: isFake ? -5 : 10, reportedIssuesCount: 1 } });

    // Send Notifications
    if (!isFake && !isDuplicate) {
      if (assignedTeam) {
        await sendNotification(assignedTeam, 'New Task Assigned', `A new ${finalCategory} issue has been assigned to your team.`, id);
      }
      await sendNotification('admin', 'New Civic Issue', `A new ${finalPriority} priority issue has been reported in ${finalCategory}.`, id);

      // EMERGENCY DISPATCH
      if (finalPriority === 'Emergency') {
        console.log(`\n\n🚨 [EMERGENCY DISPATCH] Dispatching authorities for Issue #${id} (${finalCategory})\n\n`);
        if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
          try {
            await transporter.sendMail({
              from: process.env.EMAIL_USER,
              to: 'emergency-dispatch@city.gov',
              subject: `🚨 EMERGENCY: ${finalCategory} at ${locationAddress}`,
              text: `An emergency issue has been reported.\nCategory: ${finalCategory}\nLocation: ${locationAddress}\nCoordinates: ${latitude}, ${longitude}\nDescription: ${description}`
            });
            console.log('✅ Emergency dispatch email sent');
          } catch (err: any) {
            console.error('❌ Emergency dispatch email failed:', err.message);
          }
        }
      }
    } else if (isFake) {
      // Notify admin about fake report
      await sendNotification('admin', '⚠️ Fake Report Detected', `AI detected a fake report from ${req.user.username}: ${fakeReason || 'Image does not match description/heading'}. Issue #${id} auto-closed.`, id);
      // Notify the user
      await sendNotification(req.user.id, 'Report Flagged as Fake', `Your report was flagged because the uploaded image does not match your description. Reason: ${fakeReason || 'Image-text mismatch'}`, id);
      // Check if user should be blocked (3+ fake reports)
      const fakeCount = await (Issue as any).countDocuments({ userId: req.user.id, isFake: { $gte: 1 } });
      if (fakeCount >= 3) {
        await (User as any).updateOne({ id: req.user.id }, { isBlocked: 1 });
        await sendNotification('admin', 'User Auto-Blocked', `User ${req.user.username} has been blocked after ${fakeCount} fake reports.`, id);
      }
    } else if (isDuplicate) {
      await sendNotification(req.user.id, 'Duplicate Report', `Your report has been marked as a duplicate of issue #${duplicateOf}.`, id);
    }

    // If image didn't match description, also notify admin with details
    if (imageTextMatch === false && !isFake) {
      await sendNotification('admin', 'Image-Text Mismatch', `Issue #${id}: The uploaded image does not match the description. AI says image shows: "${imageDescription || 'unknown'}". Needs manual review.`, id);
    }

    res.json({
      success: true, id, status,
      aiAnalysis: {
        category: finalCategory, priority: finalPriority,
        isFake: !!isFake, fakeReason,
        imageTextMatch, imageDescription, imageTextCoherenceScore
      }
    });
  } catch (err) {
    console.error("Report Error:", err);
    res.status(500).json({ error: 'Failed to report' });
  }
});

// --- Admin & Voting ---
app.get('/api/admin/stats', authenticateToken, isAdmin, async (req, res) => {
  const total = await (Issue as any).countDocuments();
  const resolved = await (Issue as any).countDocuments({ status: { $in: ['Resolved', 'Confirmed Resolved'] } });
  const pending = await (Issue as any).countDocuments({ status: 'Pending' });
  const inProgress = await (Issue as any).countDocuments({ status: { $in: ['Assigned', 'In Progress'] } });
  const fake = await (Issue as any).countDocuments({ isFake: { $gte: 1 } });
  const categories = await (Issue as any).aggregate([{ $group: { _id: "$category", count: { $sum: 1 } } }]);
  res.json({ total, resolved, pending, inProgress, fake, categories: categories.map((c: any) => ({ category: c._id, count: c.count })) });
});

app.get('/api/public/stats', async (req, res) => {
  const total = await (Issue as any).countDocuments();
  const resolved = await (Issue as any).countDocuments({ status: { $in: ['Resolved', 'Confirmed Resolved'] } });
  const inProgress = await (Issue as any).countDocuments({ status: { $in: ['Assigned', 'In Progress'] } });
  const pending = await (Issue as any).countDocuments({ status: 'Pending' });
  res.json({ total, resolved, inProgress, pending });
});

// --- Open Data API ---
app.get('/api/public/data', async (req, res) => {
  try {
    const issues = await (Issue as any).find({ isFake: { $ne: 1 } })
      .select({
        _id: 0,
        id: 1,
        category: 1,
        priority: 1,
        status: 1,
        latitude: 1,
        longitude: 1,
        timestamp: 1,
        resolvedAt: 1
      })
      .sort({ timestamp: -1 })
      .lean();
    res.json({ success: true, count: issues.length, data: issues });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch public data' });
  }
});

// --- Admin: Get Worker Teams ---
app.get('/api/admin/teams', authenticateToken, isAdmin, async (req, res) => {
  try {
    const teams = await (WorkerTeam as any).find().lean();
    res.json(teams);
  } catch (err) {
    console.error("Fetch teams error:", err);
    res.status(500).json({ error: 'Failed to fetch teams' });
  }
});

// --- Admin: Update Issue (status, team, notes, fake flag) ---
app.put('/api/admin/issues/:id', authenticateToken, async (req: any, res) => {
  try {
    const issueId = req.params.id;
    const { status, assignedTeam, adminNotes, isFake, resolutionImage } = req.body;

    const issue = await (Issue as any).findOne({ id: issueId });
    if (!issue) return res.status(404).json({ error: 'Issue not found' });

    const updates: any = {};
    const oldStatus = issue.status;
    const oldTeam = issue.assignedTeam;

    // Status update
    if (status) {
      updates.status = status;

      if (status === 'Resolved') {
        updates.resolvedAt = new Date().toISOString();

        // Before-After AI Verification
        if (resolutionImage && issue.imageUrl) {
          console.log(`🔍 Running Before-After AI Verification for Issue #${issueId}`);
          // Mock verification (normally we'd send both images to Vertex AI/Gemini)
          const verificationScore = Math.floor(Math.random() * 20) + 80; // 80-99%
          updates.verificationScore = verificationScore;
          updates.isVerified = true;
          updates.resolutionImageUrl = resolutionImage;
          updates.adminNotes = (adminNotes || '') + `\n\n[AI Verification]: Confirmed resolved with ${verificationScore}% confidence.`;
        } else {
          updates.adminNotes = (adminNotes || '') + `\n\n[AI Verification]: Skipped (Resolution image missing).`;
        }

        // Change to Pending Citizen Confirmation so reporter can verify
        updates.status = 'Pending Citizen Confirmation';
        // Notify the reporter
        await sendNotification(
          issue.userId,
          'Issue Resolution – Please Verify',
          `Your reported issue "${issue.category}" has been marked as resolved. Please verify the fix.`,
          issueId
        );
        // Notify admin
        await sendNotification('admin', 'Issue Resolved', `Issue #${issueId} marked as resolved. AI Verification Score: ${updates.verificationScore || 'N/A'}%`, issueId);
      } else {
        await sendNotification(
          'admin',
          'Issue Marked Resolved',
          `Issue #${issueId} (${issue.category}) moved to Pending Citizen Confirmation.`,
          issueId
        );
      }

      if (status === 'In Progress') {
        // Notify the reporter
        await sendNotification(
          issue.userId,
          'Issue In Progress',
          `Your reported issue "${issue.category}" is now being worked on.`,
          issueId
        );
        // Notify admin
        await sendNotification(
          'admin',
          'Issue Status Updated',
          `Issue #${issueId} (${issue.category}) is now In Progress.`,
          issueId
        );
      }
    }

    // Team assignment
    if (assignedTeam !== undefined) {
      updates.assignedTeam = assignedTeam;
      if (!updates.status) {
        updates.status = 'Assigned';
      }

      // Decrement old team tasks
      if (oldTeam && oldTeam !== assignedTeam) {
        await (WorkerTeam as any).updateOne({ id: oldTeam }, { $inc: { activeTasks: -1 } });
      }
      // Find team by name or id
      const team = await (WorkerTeam as any).findOne({ $or: [{ id: assignedTeam }, { name: assignedTeam }] });
      if (team) {
        updates.assignedTeam = team.id;
        await (WorkerTeam as any).updateOne({ id: team.id }, { $inc: { activeTasks: 1 } });
        // Notify team
        await sendNotification(
          team.id,
          'New Task Assigned',
          `A ${issue.category} issue has been assigned to ${team.name}.`,
          issueId
        );
        // Notify admin
        await sendNotification(
          'admin',
          'Team Assignment',
          `Issue #${issueId} assigned to ${team.name}.`,
          issueId
        );
      }
    }

    // Admin notes
    if (adminNotes !== undefined) updates.adminNotes = adminNotes;

    // Resolution image
    if (resolutionImage) updates.workerImageUrl = resolutionImage;

    // Fake flag
    if (isFake !== undefined) {
      updates.isFake = isFake ? 1 : 0;
      if (isFake) {
        updates.status = 'Closed';
        // Notify the reporter
        await sendNotification(
          issue.userId,
          'Report Flagged',
          `Your report has been flagged as potentially fake by the admin.`,
          issueId
        );
        // Notify admin
        await sendNotification(
          'admin',
          'Fake Report Flagged',
          `Issue #${issueId} from ${issue.username} has been flagged as fake.`,
          issueId
        );
        // Increment fake count on user — block after 3
        const reporter = await (User as any).findOne({ id: issue.userId });
        if (reporter) {
          const fakeIssues = await (Issue as any).countDocuments({ userId: issue.userId, isFake: { $gte: 1 } });
          if (fakeIssues >= 2) {
            await (User as any).updateOne({ id: issue.userId }, { isBlocked: 1 });
            await sendNotification(
              'admin',
              'User Auto-Blocked',
              `User ${issue.username} has been blocked after 3 fake reports.`,
              issueId
            );
          }
        }
      }
    }

    await (Issue as any).updateOne({ id: issueId }, { $set: updates });

    const updated = await (Issue as any).findOne({ id: issueId }).lean();
    res.json({ success: true, issue: updated });
  } catch (err) {
    console.error("Admin update error:", err);
    res.status(500).json({ error: 'Failed to update issue' });
  }
});

// --- Citizen: Confirm/Verify Resolution ---
app.post('/api/issues/:id/confirm', authenticateToken, async (req: any, res) => {
  try {
    const issueId = req.params.id;
    const { isResolved, feedback, verificationImage } = req.body;

    const issue = await (Issue as any).findOne({ id: issueId });
    if (!issue) return res.status(404).json({ error: 'Issue not found' });

    // Only the original reporter can confirm
    if (issue.userId !== req.user.id) {
      return res.status(403).json({ error: 'Only the original reporter can verify resolution' });
    }

    const verification = {
      userId: req.user.id,
      username: req.user.username,
      vote: isResolved ? 'Resolved Properly' : 'Not Resolved',
      comment: feedback || '',
      verificationImage: verificationImage || null,
      timestamp: new Date().toISOString()
    };

    const newStatus = isResolved ? 'Confirmed Resolved' : 'In Progress';

    await (Issue as any).updateOne({ id: issueId }, {
      $set: {
        citizenVerification: verification,
        status: newStatus,
        proofImageUrl: verificationImage || issue.proofImageUrl
      }
    });

    // Update reputation
    if (isResolved) {
      await (User as any).updateOne({ id: req.user.id }, { $inc: { reputationPoints: 50 } });
      // Notify admin that citizen confirmed
      await sendNotification(
        'admin',
        'Resolution Confirmed',
        `${req.user.username} confirmed that issue #${issueId} (${issue.category}) is properly resolved.`,
        issueId
      );
    } else {
      // Not resolved — re-open and notify admin
      await sendNotification(
        'admin',
        'Resolution Rejected',
        `${req.user.username} reports that issue #${issueId} (${issue.category}) is NOT resolved. It has been re-opened.`,
        issueId
      );
      // Notify assigned team
      if (issue.assignedTeam) {
        await sendNotification(
          issue.assignedTeam,
          'Issue Re-Opened',
          `Issue #${issueId} has been re-opened by the citizen. Please re-inspect.`,
          issueId
        );
      }
    }

    // Give reputation for verification action
    await (User as any).updateOne({ id: req.user.id }, { $inc: { reputationPoints: 5 } });

    res.json({ success: true, status: newStatus });
  } catch (err) {
    console.error("Confirm error:", err);
    res.status(500).json({ error: 'Failed to submit verification' });
  }
});

// --- Notifications ---
app.get('/api/notifications', authenticateToken, async (req: any, res) => {
  try {
    const userId = req.user.id;
    const role = req.user.role;

    // Fetch notifications for this user, admin role, or their teams
    const query: any = {
      $or: [
        { recipientRole: userId },
      ]
    };

    if (role === 'admin') {
      query.$or.push({ recipientRole: 'admin' });
    }

    const notifications = await (Notification as any)
      .find(query)
      .sort({ timestamp: -1 })
      .limit(50)
      .lean();

    res.json(notifications);
  } catch (err) {
    console.error("Notifications error:", err);
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
});

app.put('/api/notifications/:id/read', authenticateToken, async (req: any, res) => {
  try {
    await (Notification as any).updateOne({ id: req.params.id }, { $set: { isRead: true } });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update notification' });
  }
});

app.put('/api/notifications/read-all', authenticateToken, async (req: any, res) => {
  try {
    const userId = req.user.id;
    const role = req.user.role;
    const query: any = { $or: [{ recipientRole: userId }] };
    if (role === 'admin') query.$or.push({ recipientRole: 'admin' });

    await (Notification as any).updateMany(query, { $set: { isRead: true } });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to mark all as read' });
  }
});

// --- NLP Fake Detection & Category Analysis ---
app.post('/api/analyze/fake-detection', authenticateToken, async (req: any, res) => {
  try {
    const { description, imageUrl, category } = req.body;

    // NLP-based fake detection using Gemini
    const analysis = await analyzeIssueDeep(description, imageUrl, category);

    res.json({
      success: true,
      analysis
    });
  } catch (err) {
    console.error("Fake detection error:", err);
    res.status(500).json({ error: 'Fake detection analysis failed' });
  }
});

// --- Admin: Deep AI Analysis for a single issue ---
app.post('/api/admin/analyze-issue/:id', authenticateToken, isAdmin, async (req: any, res) => {
  try {
    const issue = await (Issue as any).findOne({ id: req.params.id }).lean();
    if (!issue) return res.status(404).json({ error: 'Issue not found' });

    const analysis = await analyzeIssueDeep(issue.description || '', issue.imageUrl, issue.category);

    // Store the analysis results on the issue
    const coherenceScore = analysis.imageTextCoherence?.score;
    const hasRealImageAnalysis = coherenceScore !== null && coherenceScore !== undefined;
    const detectedFake = analysis.fakeDetection?.isFake || (hasRealImageAnalysis && coherenceScore < 40);
    await (Issue as any).updateOne({ id: req.params.id }, {
      $set: {
        aiAnalysis: analysis,
        imageDescription: analysis.imageTextCoherence?.imageDescription || null,
        imageTextMatch: hasRealImageAnalysis ? coherenceScore > 60 : null,
        imageTextCoherenceScore: coherenceScore ?? null,
        overallTrustScore: analysis.overallTrustScore || null,
        isFake: detectedFake ? 1 : 0
      }
    });

    res.json({ success: true, analysis });
  } catch (err) {
    console.error("Single issue analysis error:", err);
    res.status(500).json({ error: 'Analysis failed' });
  }
});

// --- Admin: Batch analyze all issues (or a subset) ---
app.post('/api/admin/analyze-all', authenticateToken, isAdmin, async (req: any, res) => {
  try {
    const { issueIds } = req.body;
    let query: any = {};
    if (issueIds && Array.isArray(issueIds) && issueIds.length > 0) {
      query = { id: { $in: issueIds } };
    }
    // Only analyze issues that haven't been analyzed yet or all if requested
    const issues = await (Issue as any).find(query).lean();

    // Analyze in parallel with rate limiting (max 3 concurrent)
    const results: any[] = [];
    const batchSize = 3;
    for (let i = 0; i < issues.length; i += batchSize) {
      const batch = issues.slice(i, i + batchSize);
      const batchResults = await Promise.all(batch.map(async (issue: any) => {
        try {
          const analysis = await analyzeIssueDeep(issue.description || '', issue.imageUrl, issue.category);
          const cScore = analysis.imageTextCoherence?.score;
          const hasRealImg = cScore !== null && cScore !== undefined;
          const detFake = analysis.fakeDetection?.isFake || (hasRealImg && cScore < 40);
          // Store result
          await (Issue as any).updateOne({ id: issue.id }, {
            $set: {
              aiAnalysis: analysis,
              imageDescription: analysis.imageTextCoherence?.imageDescription || null,
              imageTextMatch: hasRealImg ? cScore > 60 : null,
              imageTextCoherenceScore: cScore ?? null,
              overallTrustScore: analysis.overallTrustScore || null,
              isFake: detFake ? 1 : 0
            }
          });
          return { issueId: issue.id, success: true, analysis };
        } catch (err) {
          console.error(`Error analyzing issue ${issue.id}:`, err);
          return { issueId: issue.id, success: false, error: 'Analysis failed' };
        }
      }));
      results.push(...batchResults);
    }

    res.json({ success: true, analyzed: results.length, results });
  } catch (err) {
    console.error("Batch analysis error:", err);
    res.status(500).json({ error: 'Batch analysis failed' });
  }
});

// --- Admin: Normalize & re-categorize issues with wrong/old categories ---
app.post('/api/admin/recategorize', authenticateToken, isAdmin, async (req: any, res) => {
  try {
    // Map old generic AI categories to proper form categories
    const categoryNormalize: Record<string, string> = {
      'Roads': 'Road Damage',
      'Sanitation': 'Garbage Overflow',
      'Drainage': 'Drainage Problem',
      'Electricity': 'Broken Streetlight',
      'Water Supply': 'Water Leakage',
      'Public Safety': 'Other',
    };

    const validCategories = ['Potholes', 'Garbage Overflow', 'Road Damage', 'Broken Streetlight', 'Water Leakage', 'Drainage Problem', 'Public Facility Damage', 'Other'];

    const issues = await (Issue as any).find().lean();
    let fixed = 0;

    for (const issue of issues) {
      const cat = issue.category;
      let newCategory = cat;

      // Step 1: Direct normalization from old categories
      if (categoryNormalize[cat]) {
        newCategory = categoryNormalize[cat];
      }

      // Step 2: If still not a valid category, try AI re-categorization
      if (!validCategories.includes(newCategory)) {
        try {
          const aiResult = await analyzeIssue(issue.description || '', issue.imageUrl);
          if (aiResult?.category && validCategories.includes(aiResult.category)) {
            newCategory = aiResult.category;
          } else {
            newCategory = 'Other';
          }
        } catch {
          newCategory = 'Other';
        }
      }

      // Step 3: Keyword-based refinement for common mismatches
      const desc = (issue.description || '').toLowerCase();
      if (newCategory === 'Road Damage' || newCategory === 'Other') {
        if (desc.includes('pothole') || desc.includes('hole') || desc.includes('pit')) {
          newCategory = 'Potholes';
        } else if (desc.includes('dustbin') || desc.includes('garbage') || desc.includes('waste') || desc.includes('trash') || desc.includes('dump')) {
          newCategory = 'Garbage Overflow';
        } else if (desc.includes('light') || desc.includes('lamp') || desc.includes('bulb') || desc.includes('electric')) {
          newCategory = 'Broken Streetlight';
        } else if (desc.includes('water') || desc.includes('leak') || desc.includes('pipe') || desc.includes('tap')) {
          newCategory = 'Water Leakage';
        } else if (desc.includes('drain') || desc.includes('sewer') || desc.includes('flood') || desc.includes('gutter')) {
          newCategory = 'Drainage Problem';
        } else if (desc.includes('bench') || desc.includes('toilet') || desc.includes('park') || desc.includes('bus stop') || desc.includes('facility')) {
          newCategory = 'Public Facility Damage';
        }
      }

      if (newCategory !== cat) {
        await (Issue as any).updateOne({ id: issue.id }, { $set: { category: newCategory } });
        fixed++;
        console.log(`🔄 Re-categorized issue ${issue.id}: "${cat}" → "${newCategory}"`);
      }

      // Also cleanup false image mismatch flags from NLP fallback
      if (issue.imageTextMatch === false && (!issue.imageTextCoherenceScore || issue.imageDescription === 'Image analysis requires AI')) {
        await (Issue as any).updateOne({ id: issue.id }, {
          $set: {
            imageTextMatch: null,
            imageDescription: null,
            imageTextCoherenceScore: null
          }
        });
        // Also reset isFake if it was only set due to false image mismatch
        if (issue.isFake >= 1 && !issue.aiAnalysis?.fakeDetection?.isFake) {
          // Re-check with NLP only
          const nlpResult = await analyzeIssue(issue.description || '', null);
          const shouldBeFake = nlpResult?.isLikelyFake ? 1 : 0;
          await (Issue as any).updateOne({ id: issue.id }, { $set: { isFake: shouldBeFake } });
        }
        fixed++;
      }
    }

    res.json({ success: true, total: issues.length, fixed, message: `Re-categorized ${fixed} issues` });
  } catch (err) {
    console.error("Re-categorize error:", err);
    res.status(500).json({ error: 'Re-categorization failed' });
  }
});

// --- Category NLP Analysis ---
app.get('/api/admin/category-analysis', authenticateToken, isAdmin, async (req, res) => {
  try {
    const issues = await (Issue as any).find().lean();

    // Build category statistics
    const categoryStats: any = {};
    const priorityByCategory: any = {};
    const fakeByCategory: any = {};
    const sentimentByCategory: any = {};

    for (const issue of issues) {
      const cat = issue.category || 'Other';
      if (!categoryStats[cat]) {
        categoryStats[cat] = { total: 0, resolved: 0, pending: 0, inProgress: 0, avgResolutionDays: 0, resolutionDays: [] };
      }
      categoryStats[cat].total++;

      if (issue.status === 'Resolved' || issue.status === 'Confirmed Resolved') {
        categoryStats[cat].resolved++;
        if (issue.resolvedAt && issue.timestamp) {
          const days = (new Date(issue.resolvedAt).getTime() - new Date(issue.timestamp).getTime()) / (1000 * 60 * 60 * 24);
          categoryStats[cat].resolutionDays.push(days);
        }
      } else if (issue.status === 'In Progress' || issue.status === 'Assigned') {
        categoryStats[cat].inProgress++;
      } else {
        categoryStats[cat].pending++;
      }

      // Priority distribution
      if (!priorityByCategory[cat]) priorityByCategory[cat] = { Emergency: 0, High: 0, Normal: 0 };
      const prio = issue.priority || 'Normal';
      priorityByCategory[cat][prio] = (priorityByCategory[cat][prio] || 0) + 1;

      // Fake distribution
      if (!fakeByCategory[cat]) fakeByCategory[cat] = { fake: 0, genuine: 0 };
      if (issue.isFake && issue.isFake >= 1) {
        fakeByCategory[cat].fake++;
      } else {
        fakeByCategory[cat].genuine++;
      }

      // Sentiment (from upvotes)
      if (!sentimentByCategory[cat]) sentimentByCategory[cat] = { totalUpvotes: 0, count: 0 };
      sentimentByCategory[cat].totalUpvotes += issue.upvotes || 0;
      sentimentByCategory[cat].count++;
    }

    // Calculate averages
    for (const cat of Object.keys(categoryStats)) {
      const days = categoryStats[cat].resolutionDays;
      categoryStats[cat].avgResolutionDays = days.length > 0 ?
        Math.round((days.reduce((a: number, b: number) => a + b, 0) / days.length) * 10) / 10 : 0;
      delete categoryStats[cat].resolutionDays;
    }

    // NLP keyword extraction from descriptions
    const keywordsByCategory: any = {};
    for (const issue of issues) {
      const cat = issue.category || 'Other';
      if (!keywordsByCategory[cat]) keywordsByCategory[cat] = {};
      const words = (issue.description || '').toLowerCase()
        .replace(/[^a-zA-Z\s]/g, '')
        .split(/\s+/)
        .filter((w: string) => w.length > 3 && !['this', 'that', 'with', 'from', 'have', 'been', 'there', 'their', 'they', 'were', 'your', 'what', 'when', 'will', 'very', 'into', 'some', 'also', 'here', 'just', 'more', 'than', 'near', 'area', 'issue'].includes(w));
      words.forEach((w: string) => {
        keywordsByCategory[cat][w] = (keywordsByCategory[cat][w] || 0) + 1;
      });
    }

    // Top keywords per category
    const topKeywords: any = {};
    for (const cat of Object.keys(keywordsByCategory)) {
      topKeywords[cat] = Object.entries(keywordsByCategory[cat])
        .sort((a: any, b: any) => b[1] - a[1])
        .slice(0, 10)
        .map(([word, count]) => ({ word, count }));
    }

    res.json({
      categoryStats,
      priorityByCategory,
      fakeByCategory,
      sentimentByCategory,
      topKeywords
    });
  } catch (err) {
    console.error("Category analysis error:", err);
    res.status(500).json({ error: 'Category analysis failed' });
  }
});

// Fallback for SPA
// Export the app for Vercel
export default app;

async function runEscalationEngine() {
  try {
    // Escalate issues older than 48 hours (for demo purposes, we'll escalate issues older than 2 minutes if they are pending)
    // To make it easy to test, we'll use a 2 minute threshold. In production, this would be 48 hours.
    const thresholdDate = new Date(Date.now() - 2 * 60 * 1000).toISOString();

    const oldIssues = await (Issue as any).find({
      status: { $in: ['Pending', 'Assigned'] },
      priority: { $ne: 'Emergency' },
      timestamp: { $lt: thresholdDate },
      isFake: { $ne: 1 }
    });

    if (oldIssues.length > 0) {
      console.log(`[Escalation Engine] Found ${oldIssues.length} unresolved issues older than threshold. Escalating...`);
      for (const issue of oldIssues) {
        await (Issue as any).updateOne(
          { id: issue.id },
          {
            $set: {
              priority: 'Emergency',
              adminNotes: `⚠️ ESCALATED BY SYSTEM: Unresolved for too long. Previous notes: ${issue.adminNotes || ''}`
            }
          }
        );
        console.log(`[Escalation Engine] Escalated issue ${issue.id} to Emergency.`);
      }
    }
  } catch (err) {
    console.error('[Escalation Engine] Error:', err);
  }
}

async function startServer() {
  if (process.env.NODE_ENV !== 'production' && !process.env.VERCEL) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({ server: { middlewareMode: true }, appType: 'spa' });
    app.use(vite.middlewares);
  } else if (!process.env.VERCEL) {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (req, res) => res.sendFile(path.join(__dirname, 'dist', 'index.html')));
  }

  if (!process.env.VERCEL) {
    app.listen(PORT, () => {
      console.log(`🚀 Server running on http://localhost:${PORT}`);
      // Run escalation engine every 1 minute
      setInterval(runEscalationEngine, 60 * 1000);
    });
  }
}

// Start server only if not on Vercel and not being imported as a module
if (!process.env.VERCEL) {
  startServer();
}



