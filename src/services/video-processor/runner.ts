import type { ProcessingStatus } from '@/data/models/VideoProcess';
import {
  advanceVideoProcessing,
  type ProcessingJobPayload,
} from '@/services/video-processor/staged-worker';
import { triggerBackgroundProcessing } from '@/lib/video/trigger-processing';
import { logger } from '@/lib/logger';

export type ProcessingRunResult = {
  status: ProcessingStatus;
  error?: string;
  progress?: number;
  /** Worker hit time limit — another worker was chained */
  continued?: boolean;
};

/**
 * Run the full staged pipeline in one backend request (loops until done or timeout).
 * Pattern from media-search-engine: gateway queues job, worker processes to completion.
 */
export async function runVideoProcessingLoop(
  payload: ProcessingJobPayload,
  options?: { maxRuntimeMs?: number }
): Promise<ProcessingRunResult> {
  const maxRuntimeMs = options?.maxRuntimeMs ?? 270_000;
  const deadline = Date.now() + maxRuntimeMs;
  let last: ProcessingRunResult = { status: 'pending', progress: 0 };

  while (Date.now() < deadline) {
    last = await advanceVideoProcessing({ ...payload, force: true });
    if (last.status === 'complete' || last.status === 'failed') {
      logger.info('Video processing finished', {
        videoId: payload.videoId,
        status: last.status,
      });
      return last;
    }
  }

  logger.info('Video processing continuing in background', {
    videoId: payload.videoId,
    status: last.status,
    progress: last.progress,
  });

  await triggerBackgroundProcessing(
    payload.videoId,
    payload.source,
    payload.ownerId
  );

  return { ...last, continued: true };
}

export async function processPendingVideoJobs(
  limit = 5
): Promise<Array<{ videoId: string; result: ProcessingRunResult }>> {
  const { listVideosPendingProcessing } = await import('@/lib/db/video-repository');
  const pending = await listVideosPendingProcessing(limit);
  const results: Array<{ videoId: string; result: ProcessingRunResult }> = [];

  for (const video of pending) {
    const source =
      video.source === 'upload' ? ('upload' as const) : ('youtube' as const);
    try {
      const result = await runVideoProcessingLoop({
        videoId: video.videoId,
        ownerId: video.ownerId ?? null,
        source,
      });
      results.push({ videoId: video.videoId, result });
    } catch (error) {
      logger.error(
        'Pending video job failed',
        error instanceof Error ? error : new Error(String(error)),
        { videoId: video.videoId }
      );
      results.push({
        videoId: video.videoId,
        result: {
          status: 'failed',
          error: error instanceof Error ? error.message : 'Worker error',
        },
      });
    }
  }

  return results;
}
