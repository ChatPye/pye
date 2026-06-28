import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { requireAurora } from '@/lib/db/require-aurora';
import {
  createThread,
  listThreadsForVideo,
} from '@/lib/db/community-repository';

export async function GET(request: NextRequest) {
  try {
    await requireAuth();
    requireAurora('Community threads');

    const videoId = request.nextUrl.searchParams.get('videoId');
    if (!videoId) {
      return NextResponse.json({ success: false, error: 'videoId is required' }, { status: 400 });
    }

    const threads = await listThreadsForVideo(videoId);
    return NextResponse.json({ success: true, threads });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unauthorized';
    return NextResponse.json({ success: false, error: message }, { status: 401 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const authUser = await requireAuth();
    requireAurora('Community threads');

    const body = await request.json();
    const videoId = typeof body.videoId === 'string' ? body.videoId.trim() : '';
    const title = typeof body.title === 'string' ? body.title.trim() : '';
    const content = typeof body.content === 'string' ? body.content.trim() : '';

    if (!videoId || !title || !content) {
      return NextResponse.json(
        { success: false, error: 'videoId, title and content are required' },
        { status: 400 }
      );
    }

    const thread = await createThread({
      videoId,
      title,
      content,
      authorClerkId: authUser.id,
      authorName: authUser.email ?? 'Learner',
    });

    return NextResponse.json({ success: true, thread });
  } catch (error) {
    console.error('Create thread error:', error);
    return NextResponse.json({ success: false, error: 'Failed to create thread' }, { status: 500 });
  }
}
