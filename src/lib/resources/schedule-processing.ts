import { after } from 'next/server';
import { logger } from '@/lib/logger';
import type { ResourceProcessingMessage } from '@/lib/queue/resource-processing-types';
import { processYoutubeImportJob } from '@/services/resource-processor/youtube-import';
import { triggerResourceWorker } from '@/lib/resources/trigger-worker';

/** Run resource import asynchronously — never block the HTTP import response. */
export function scheduleResourceProcessing(message: ResourceProcessingMessage): void {
  const run = async () => {
    try {
      await processYoutubeImportJob(message);
    } catch (error) {
      logger.error(
        'Scheduled resource processing failed',
        error instanceof Error ? error : new Error(String(error)),
        { resourceId: message.resourceId, jobId: message.jobId },
      );
    }
  };

  try {
    after(run);
  } catch {
    void run();
  }

  void triggerResourceWorker(message);
}
