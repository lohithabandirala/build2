import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import { User } from '@/models/User';

export async function GET() {
  try {
    await connectDB();
    
    const topUsers = await User.find({ role: 'citizen' })
      .sort({ reputationPoints: -1 })
      .limit(10)
      .lean();

    return NextResponse.json({ success: true, data: topUsers });
  } catch (error) {
    console.error("GET Leaderboard Error:", error);
    return NextResponse.json({ success: false, error: "Failed to fetch leaderboard" }, { status: 500 });
  }
}
