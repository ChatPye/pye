import { NextRequest, NextResponse } from 'next/server';
import { findVideoByExternalId } from '@/lib/db/video-repository';
import { runVideoProcessingLoop } from '@/services/video-processor/runner';
import {
  triggerBackgroundProcessing,
  verifyWorkerAuth,
} from '@/lib/video/trigger-processing';
import { processingProgressFor } from '@/services/video-processor/staged-worker';
import { logger } from '@/lib/logger';

export const maxDuration = 300;
export const dynamic = 'force-dynamic';

/** Backend worker — runs full pipeline without browser (media-search-engine worker pattern). */
export async function POST(request: NextRequest) {
  if (!verifyWorkerAuth(request)) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const videoId = typeof body.videoId === 'string' ? body.videoId.trim() : '';
    const source =
      body.source === 'upload' || body.source === 'youtube' ? body.source : undefined;
    const ownerId = typeof body.ownerId === 'string' ? body.ownerId : null;

    if (!videoId) {
      return NextResponse.json({ success: false, error: 'videoId required' }, { status: 400 });
    }

    const record = await findVideoByExternalId(videoId);
    if (!record) {
      return NextResponse.json({ success: false, error: 'Video not found' }, { status: 404 });
    }

    if (record.processingStatus === 'complete') {
      return NextResponse.json({
        success: true,
        status: 'complete',
        progress: 100,
        videoId,
      });
    }

    const resolvedSource =
      source || (record.source === 'upload' ? 'upload' : 'youtube');

    const result = await runVideoProcessingLoop({
      videoId,
      ownerId: ownerId ?? record.ownerId ?? null,
      source: resolvedSource,
    });

    if (result.continued) {
      logger.info('Worker chained continuation', { videoId, status: result.status });
    }

    return NextResponse.json({
      success: true,
      videoId,
      status: result.status,
      progress: result.progress ?? processingProgressFor(result.status),
      error: result.error,
      continued: result.continued ?? false,
    });
  } catch (error) {
    logger.error(
      'Video process worker error',
      error instanceof Error ? error : new Error(String(error))
    );
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Worker failed' },
      { status: 500 }
    );
  }
}

/** Manual re-queue (cron or ops). */
export async function GET(request: NextRequest) {
  if (!verifyWorkerAuth(request)) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const videoId = searchParams.get('videoId')?.trim();
  if (!videoId) {
    return NextResponse.json({ success: false, error: 'videoId required' }, { status: 400 });
  }

  const record = await findVideoByExternalId(videoId);
  if (!record) {
    return NextResponse.json({ success: false, error: 'Video not found' }, { status: 404 });
  }

  await triggerBackgroundProcessing(
    videoId,
    record.source === 'upload' ? 'upload' : 'youtube',
    record.ownerId ?? null
  );

  return NextResponse.json({ success: true, queued: true, videoId });
}
