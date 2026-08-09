import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { parseResourceProcessingMessage } from '@/lib/queue/resource-processing-types';
import { processYoutubeImportJob } from '@/services/resource-processor/youtube-import';
import { verifyWorkerAuth } from '@/lib/resources/trigger-worker';

export const maxDuration = 300;
export const dynamic = 'force-dynamic';

/** Backend worker — processes resource import jobs (SQS / cron / local trigger). */
export async function POST(request: NextRequest) {
  if (!verifyWorkerAuth(request)) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const message = parseResourceProcessingMessage(JSON.stringify(body));

    await processYoutubeImportJob(message);

    return NextResponse.json({
      success: true,
      resourceId: message.resourceId,
      jobId: message.jobId,
    });
  } catch (error) {
    logger.error(
      'Resource process worker error',
      error instanceof Error ? error : new Error(String(error)),
    );
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Worker failed' },
      { status: 500 },
    );
  }
}
