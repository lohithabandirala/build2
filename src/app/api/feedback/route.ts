import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import { Issue } from '@/models/Issue';

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

    const newIssue = await Issue.create({
      id: Math.random().toString(36).substring(2, 9),
      createdAt: new Date().toISOString(),
      upvotes: 0,
      votedBy: [],
      isFake,
      fakeReason,
      status: isFake ? 'Closed' : 'Open', // Auto-close fake reports
      ...data
    });

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

    if (action === 'upvote') {
      if (!issue.votedBy) issue.votedBy = [];
      if (issue.votedBy.includes(mockUserId)) {
        return NextResponse.json({ success: false, error: "Already voted" }, { status: 400 });
      }
      issue.upvotes += 1;
      issue.votedBy.push(mockUserId);
      await issue.save();
    } else if (action === 'community_vote') {
      if (!issue.communityVotes) issue.communityVotes = [];
      issue.communityVotes.push({
        userId: mockUserId,
        username: "Verified Citizen",
        vote: voteType, // 'Verified' or 'Fake'
        comment: comment || '',
        timestamp: new Date().toISOString()
      });
      await issue.save();
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
        username: "Original Reporter",
        vote: isResolved ? 'Confirmed Resolved' : 'Not Resolved',
        comment: feedback || '',
        timestamp: new Date().toISOString()
      });
      await issue.save();
    }

    return NextResponse.json({ success: true, data: issue });
  } catch (error) {
    console.error("PUT Feedback Error:", error);
    return NextResponse.json({ success: false, error: "Failed to update feedback" }, { status: 500 });
  }
}
