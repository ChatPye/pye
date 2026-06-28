import { after } from 'next/server';
import { logger } from '@/lib/logger';
import { runVideoProcessingLoop } from '@/services/video-processor/runner';
import type { ProcessingJobPayload } from '@/services/video-processor/staged-worker';
import { triggerBackgroundProcessing } from '@/lib/video/trigger-processing';

/**
 * Schedule video processing on the server (survives response — no browser tab needed).
 * Uses Next.js after(); falls back to HTTP worker when CRON_SECRET + after unavailable.
 */
export function scheduleVideoProcessing(payload: ProcessingJobPayload): void {
  const run = async () => {
    try {
      const result = await runVideoProcessingLoop(payload);
      if (result.continued) {
        await triggerBackgroundProcessing(
          payload.videoId,
          payload.source,
          payload.ownerId
        );
      }
    } catch (error) {
      logger.error(
        'Scheduled video processing failed',
        error instanceof Error ? error : new Error(String(error)),
        { videoId: payload.videoId }
      );
    }
  };

  try {
    after(run);
  } catch {
    void run();
  }

  // Also try HTTP worker as belt-and-suspenders when configured
  void triggerBackgroundProcessing(payload.videoId, payload.source, payload.ownerId);
}
