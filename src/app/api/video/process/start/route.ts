import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { findVideoByExternalId } from '@/lib/db/video-repository';
import { triggerBackgroundProcessing } from '@/lib/video/trigger-processing';
import { startVideoProcessing } from '@/services/video-processor/staged-worker';

/** User-facing: queue backend worker after upload or retry (no browser tick required). */
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

    await startVideoProcessing({
      videoId,
      ownerId: authUser.id,
      source: resolvedSource,
    });

    await triggerBackgroundProcessing(videoId, resolvedSource, authUser.id);

    return NextResponse.json({
      success: true,
      videoId,
      message: 'Processing queued on server',
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to start' },
      { status: 500 }
    );
  }
}
