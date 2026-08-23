import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import { User } from '@/models/User';

export async function GET() {
  try {
    await connectDB();
    
    // Check if we have any users, if not seed some dummy data for the prototype
    const count = await User.countDocuments();
    if (count === 0) {
      await User.insertMany([
        { id: '1', username: 'Rahul S.', role: 'citizen', reputationPoints: 1250, badges: ['Civic Hero'] },
        { id: '2', username: 'Priya M.', role: 'citizen', reputationPoints: 940, badges: ['Community Watcher'] },
        { id: '3', username: 'Amit K.', role: 'citizen', reputationPoints: 810, badges: ['Active Citizen'] },
        { id: '4', username: 'Sneha R.', role: 'citizen', reputationPoints: 620, badges: ['Reporter'] },
        { id: '5', username: 'Vikram P.', role: 'citizen', reputationPoints: 450, badges: ['Reporter'] },
      ]);
    }

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
