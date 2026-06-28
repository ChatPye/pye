import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { videoId, startTime, endTime, title, description } = body;

    if (!videoId || startTime === undefined || endTime === undefined) {
      return NextResponse.json({ error: 'Video ID, start time, and end time are required' }, { status: 400 });
    }

    // For now, just log the snip - in production this would save to database
    console.log(`User ${userId} created snip for video ${videoId}:`, {
      startTime,
      endTime,
      title,
      description
    });

    return NextResponse.json({ 
      success: true, 
      message: 'Snip created successfully',
      snipId: `snip_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    });
  } catch (error) {
    console.error('Error creating snip:', error);
    return NextResponse.json({ error: 'Failed to create snip' }, { status: 500 });
  }
}
