import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { videoId, shareType, shareData } = body;

    if (!videoId || !shareType) {
      return NextResponse.json({ error: 'Video ID and share type are required' }, { status: 400 });
    }

    // For now, just log the share - in production this would handle different share types
    console.log(`User ${userId} shared video ${videoId}:`, {
      shareType,
      shareData
    });

    // Generate share URL based on type
    let shareUrl = '';
    switch (shareType) {
      case 'link':
        shareUrl = `${process.env.NEXT_PUBLIC_APP_URL}/workspace/${videoId}`;
        break;
      case 'embed':
        shareUrl = `${process.env.NEXT_PUBLIC_APP_URL}/embed/${videoId}`;
        break;
      default:
        shareUrl = `${process.env.NEXT_PUBLIC_APP_URL}/workspace/${videoId}`;
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Share link generated successfully',
      shareUrl,
      shareId: `share_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    });
  } catch (error) {
    console.error('Error sharing video:', error);
    return NextResponse.json({ error: 'Failed to share video' }, { status: 500 });
  }
}
