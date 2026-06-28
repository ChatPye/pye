import { NextRequest, NextResponse } from 'next/server';
import { processPendingVideoJobs } from '@/services/video-processor/runner';
import { verifyWorkerAuth } from '@/lib/video/trigger-processing';
import { logger } from '@/lib/logger';

export const maxDuration = 300;
export const dynamic = 'force-dynamic';

/** Vercel cron — process stuck/pending videos every 2 minutes. */
export async function GET(request: NextRequest) {
  if (!verifyWorkerAuth(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const results = await processPendingVideoJobs(5);
    logger.info('Cron video-process completed', { count: results.length });

    return NextResponse.json({
      success: true,
      processed: results.length,
      results: results.map((r) => ({
        videoId: r.videoId,
        status: r.result.status,
        progress: r.result.progress,
        continued: r.result.continued,
      })),
    });
  } catch (error) {
    logger.error(
      'Cron video-process failed',
      error instanceof Error ? error : new Error(String(error))
    );
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Cron failed' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  return GET(request);
}
