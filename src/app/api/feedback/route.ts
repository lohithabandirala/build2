import { NextResponse } from 'next/server';

// In-memory store for the hackathon prototype (resets when the server restarts)
const feedbackStore: any[] = [];

export async function GET() {
  return NextResponse.json({ success: true, data: feedbackStore });
}

export async function POST(request: Request) {
  try {
    const data = await request.json();
    
    // Add timestamp, ID, and default upvotes
    const newFeedback = {
      id: Math.random().toString(36).substring(2, 9),
      createdAt: new Date().toISOString(),
      upvotes: 0,
      ...data
    };

    feedbackStore.unshift(newFeedback); // Add to beginning

    return NextResponse.json({ success: true, data: newFeedback });
  } catch (error) {
    return NextResponse.json({ success: false, error: "Failed to save feedback" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const { id, action } = await request.json();
    
    const index = feedbackStore.findIndex(f => f.id === id);
    if (index === -1) {
      return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });
    }

    if (action === 'upvote') {
      feedbackStore[index].upvotes += 1;
    }

    return NextResponse.json({ success: true, data: feedbackStore[index] });
  } catch (error) {
    return NextResponse.json({ success: false, error: "Failed to update feedback" }, { status: 500 });
  }
}
