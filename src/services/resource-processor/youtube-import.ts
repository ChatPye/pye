import { analyseResourceStructured } from '@/lib/ai/router';
import { logger } from '@/lib/logger';
import type { ResourceProcessingMessage } from '@/lib/queue/resource-processing-types';
import {
  findResourceById,
  transitionResourceState,
  updateResourceProcessingJob,
} from '@/lib/db/resource-repository';
import { syncLegacyVideoFromResource } from '@/services/resource-processor/legacy-video-bridge';
import { fetchYoutubeOEmbedMetadata } from '@/services/resource-processor/fetch-youtube-metadata';
import { isUserVisibleReadyState } from '@/lib/resources/state-machine';

const MAX_ATTEMPTS = 3;

export async function processYoutubeImportJob(message: ResourceProcessingMessage): Promise<void> {
  const resource = await findResourceById(message.resourceId);
  if (!resource) {
    throw new Error(`Resource not found: ${message.resourceId}`);
  }

  if (isUserVisibleReadyState(resource.processingState)) {
    logger.info('Resource already ready — skipping job', {
      resourceId: message.resourceId,
      jobId: message.jobId,
    });
    return;
  }

  if (resource.processingState === 'failed') {
    logger.info('Resource in failed state — retry via import API', {
      resourceId: message.resourceId,
    });
    return;
  }

  try {
    await runPipeline(message, resource.sourceRef);
  } catch (error) {
    const messageText = error instanceof Error ? error.message : String(error);
    logger.error('YouTube import job failed', error instanceof Error ? error : undefined, {
      resourceId: message.resourceId,
      jobId: message.jobId,
    });

    await updateResourceProcessingJob(message.jobId, {
      lastError: messageText,
      progressPercent: 0,
    });

    await transitionResourceState(message.resourceId, 'failed', {
      failureCode: 'IMPORT_FAILED',
      failureMessage: messageText,
    });

    await syncLegacyVideoFromResource(message.resourceId, 'failed', messageText);
  }
}

async function runPipeline(message: ResourceProcessingMessage, sourceRef: string): Promise<void> {
  const videoId = sourceRef.match(/v=([A-Za-z0-9_-]{11})/)?.[1];
  if (!videoId) throw new Error('INVALID_SOURCE_REF');

  await step(message, 'processing_metadata', 15, async () => {
    const metadata = await fetchYoutubeOEmbedMetadata(videoId);
    await transitionResourceState(message.resourceId, 'processing_metadata', {
      title: metadata.title,
      description: metadata.author ? `Channel: ${metadata.author}` : null,
    });
    await syncLegacyVideoFromResource(message.resourceId, 'processing_metadata', undefined, metadata);
  });

  let analysis: Record<string, unknown> | null = null;

  await step(message, 'analysing_content', 55, async () => {
    await transitionResourceState(message.resourceId, 'analysing_content');
    await syncLegacyVideoFromResource(message.resourceId, 'analysing_content');

    const { analysis: structured } = await analyseResourceStructured({
      sourceType: 'youtube',
      sourceRef,
      titleHint: (await findResourceById(message.resourceId))?.title,
      userId: message.ownerUserId,
      organisationId: message.organisationId ?? undefined,
    });
    analysis = structured as unknown as Record<string, unknown>;
  });

  await step(message, 'generating_learning_structure', 85, async () => {
    await transitionResourceState(message.resourceId, 'generating_learning_structure');
    await syncLegacyVideoFromResource(message.resourceId, 'generating_learning_structure');
  });

  await step(message, 'ready', 100, async () => {
    await transitionResourceState(message.resourceId, 'ready', {
      artefact: analysis,
      title: typeof analysis?.title === 'string' ? analysis.title : undefined,
      description:
        typeof analysis?.description === 'string' ? analysis.description : undefined,
    });
    await syncLegacyVideoFromResource(message.resourceId, 'ready', undefined, undefined, analysis);
    await updateResourceProcessingJob(message.jobId, { state: 'ready', progressPercent: 100 });
  });
}

async function step(
  message: ResourceProcessingMessage,
  state: 'processing_metadata' | 'analysing_content' | 'generating_learning_structure' | 'ready',
  progressPercent: number,
  fn: () => Promise<void>,
): Promise<void> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    try {
      await updateResourceProcessingJob(message.jobId, { attempt, progressPercent, state });
      await fn();
      return;
    } catch (error) {
      lastError = error;
      logger.warn('Resource pipeline step retry', {
        resourceId: message.resourceId,
        state,
        attempt,
        error: error instanceof Error ? error.message : String(error),
      });
      if (attempt < MAX_ATTEMPTS) {
        const jitter = Math.floor(Math.random() * 250);
        await sleep(2 ** attempt * 200 + jitter);
      }
    }
  }
  throw lastError instanceof Error ? lastError : new Error(String(lastError));
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
