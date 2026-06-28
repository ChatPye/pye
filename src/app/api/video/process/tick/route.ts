import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { findVideoByExternalId } from '@/lib/db/video-repository';
import { advanceVideoProcessing } from '@/services/video-processor/staged-worker';
import { sanitizeVideoForClient } from '@/lib/video/client-video';

export const maxDuration = 300;

/** Advance video processing by one stage (designed for client polling on Vercel). */
export async function POST(request: NextRequest) {
  try {
    const authUser = await requireAuth();
    const body = await request.json();
    const videoId = typeof body.videoId === 'string' ? body.videoId.trim() : '';
    const source =
      body.source === 'upload' || body.source === 'youtube' ? body.source : undefined;

    if (!videoId) {
      return NextResponse.json({ success: false, error: 'videoId required' }, { status: 400 });
    }

    const record = await findVideoByExternalId(videoId);
    if (!record) {
      return NextResponse.json({ success: false, error: 'Video not found' }, { status: 404 });
    }

    if (record.ownerId && record.ownerId !== authUser.id) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    const resolvedSource =
      source || (record.source === 'upload' ? 'upload' : 'youtube');

    const result = await advanceVideoProcessing({
      videoId,
      ownerId: authUser.id,
      source: resolvedSource,
    });

    const updated = await findVideoByExternalId(videoId);

    return NextResponse.json({
      success: true,
      status: result.status,
      progress: result.progress,
      error: result.error,
      video: sanitizeVideoForClient(updated),
    });
  } catch (error) {
    console.error('Process tick error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Tick failed' },
      { status: 500 }
    );
  }
}
