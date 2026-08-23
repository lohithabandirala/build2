import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import { Issue } from '@/models/Issue';
import { User } from '@/models/User';

async function awardPoints(userId: string, points: number) {
  if (!userId) return;
  const user = await User.findOne({ id: userId });
  if (user) {
    user.reputationPoints += points;
    if (user.reputationPoints >= 1000 && !user.badges.includes('Civic Hero')) user.badges.push('Civic Hero');
    else if (user.reputationPoints >= 500 && !user.badges.includes('Active Citizen')) user.badges.push('Active Citizen');
    else if (user.reputationPoints >= 100 && !user.badges.includes('Reporter')) user.badges.push('Reporter');
    await user.save();
  } else {
    let initialBadge = 'Citizen';
    if (points >= 100) initialBadge = 'Reporter';
    await User.create({
      id: userId,
      username: 'Citizen ' + userId.substring(userId.length - 4),
      role: 'citizen',
      reputationPoints: points,
      badges: [initialBadge]
    });
  }
}

export async function GET() {
  try {
    await connectDB();
    const issues = await Issue.find().sort({ createdAt: -1 }).lean();
    return NextResponse.json({ success: true, data: issues });
  } catch (error) {
    console.error("GET Feedback Error:", error);
    return NextResponse.json({ success: false, error: "Failed to fetch feedback" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    await connectDB();
    const data = await request.json();
    
    // Simulate Fake Detection based on AI Analysis Coherence
    // If AI explicitly says it's fake or category is drastically wrong, flag it.
    let isFake = 0;
    let fakeReason = '';
    
    if (data.ai_analysis?.isLikelyFake) {
      isFake = 1;
      fakeReason = 'AI detected inconsistency in the image vs description.';
    }

    const { userId, ...issueData } = data;

    const newIssue = await Issue.create({
      id: Math.random().toString(36).substring(2, 9),
      createdAt: new Date().toISOString(),
      upvotes: 0,
      votedBy: [],
      isFake,
      fakeReason,
      status: isFake ? 'Closed' : 'Open', // Auto-close fake reports
      userId,
      ...issueData
    });

    if (userId && !isFake) {
      await awardPoints(userId, 50); // 50 points for reporting a real issue
    }

    return NextResponse.json({ success: true, data: newIssue });
  } catch (error) {
    console.error("POST Feedback Error:", error);
    return NextResponse.json({ success: false, error: "Failed to save feedback" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    await connectDB();
    const { id, action, comment, voteType, status, team, notes, isResolved, feedback, userId } = await request.json();
    
    const issue = await Issue.findOne({ id });
    if (!issue) {
      return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });
    }

    // Use the client-provided persistent anonymous ID, fallback to random if missing
    const mockUserId = userId || "citizen_" + Math.random().toString(36).substring(2, 6);

    // Fetch the actual user from DB to get their username
    let user = await User.findOne({ id: mockUserId });
    if (!user) {
      // Create them if they don't exist yet so they have a username
      user = await User.create({
        id: mockUserId,
        username: 'Citizen ' + mockUserId.substring(mockUserId.length - 4),
        role: 'citizen',
        reputationPoints: 0,
        badges: ['Citizen']
      });
    }

    if (action === 'upvote') {
      if (!issue.votedBy) issue.votedBy = [];
      if (issue.votedBy.includes(mockUserId)) {
        issue.upvotes -= 1;
        issue.votedBy = issue.votedBy.filter((id: string) => id !== mockUserId);
        await issue.save();
      } else {
        issue.upvotes += 1;
        issue.votedBy.push(mockUserId);
        await issue.save();
        await awardPoints(mockUserId, 5); 
      }
    } else if (action === 'community_vote') {
      if (!issue.communityVotes) issue.communityVotes = [];
      issue.communityVotes.push({
        userId: mockUserId,
        username: user.username,
        vote: voteType,
        comment: comment || '',
        timestamp: new Date().toISOString()
      });
      await issue.save();
      await awardPoints(mockUserId, 20); 
    } else if (action === 'update_status') {
      issue.status = status;
      if (status === 'Resolved') {
        issue.adminNotes = (issue.adminNotes || '') + '\n[Admin]: Marked as Resolved. Pending citizen confirmation.';
      }
      await issue.save();
    } else if (action === 'assign_team') {
      issue.assignedTeam = team;
      if (issue.status === 'Open') issue.status = 'Assigned';
      await issue.save();
    } else if (action === 'admin_notes') {
      issue.adminNotes = notes;
      await issue.save();
    } else if (action === 'confirm_resolution') {
      issue.status = isResolved ? 'Closed' : 'In Progress';
      if (!issue.communityVotes) issue.communityVotes = [];
      issue.communityVotes.push({
        userId: mockUserId,
        username: user.username + " (Original Reporter)",
        vote: isResolved ? 'Confirmed Resolved' : 'Not Resolved',
        comment: feedback || '',
        timestamp: new Date().toISOString()
      });
      await issue.save();
      await awardPoints(mockUserId, 30); 
    }

    return NextResponse.json({ success: true, data: issue });
  } catch (error) {
    console.error("PUT Feedback Error:", error);
    return NextResponse.json({ success: false, error: "Failed to update feedback" }, { status: 500 });
  }
}
