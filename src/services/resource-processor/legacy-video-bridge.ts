import { eq } from 'drizzle-orm';
import { getDb, isDatabaseConfigured } from '@/lib/db';
import { schema } from '@/lib/db';
import {
  findResourceById,
  mapLegacyVideoProcessingStatus,
} from '@/lib/db/resource-repository';
import type { ResourceProcessingState } from '@/lib/resources/types';
import type { YoutubeOEmbedMetadata } from '@/services/resource-processor/fetch-youtube-metadata';
import type { ProcessingStatus } from '@/data/models/VideoProcess';
import { persistVideoRecord } from '@/lib/db/video-repository';
import type { VideoRecord } from '@/lib/db/video-types';

/** Dual-write bridge so legacy `/workspace/[videoId]` keeps working during migration. */
export async function syncLegacyVideoFromResource(
  resourceId: string,
  state: ResourceProcessingState,
  errorMessage?: string,
  metadata?: YoutubeOEmbedMetadata,
  artefact?: Record<string, unknown> | null,
): Promise<void> {
  if (!isDatabaseConfigured()) return;

  const resource = await findResourceById(resourceId);
  if (!resource?.legacyExternalId) return;

  const videoId = resource.legacyExternalId;
  const processingStatus = mapResourceStateToLegacyStatus(state) as ProcessingStatus;

  const patch: Partial<VideoRecord> = {
    videoId,
    ownerId: resource.ownerUserId,
    source: 'youtube',
    title: metadata?.title ?? resource.title,
    channel: metadata?.author,
    thumbnail: metadata?.thumbnail,
    videoUrl: resource.sourceRef,
    processingStatus,
    errorMessage: errorMessage ?? undefined,
  };

  if (artefact && state === 'ready') {
    patch.summary = typeof artefact.summary === 'string' ? artefact.summary : undefined;
    patch.keyPoints = Array.isArray(artefact.learningObjectives)
      ? (artefact.learningObjectives as string[])
      : [];
    patch.chapters = Array.isArray(artefact.chapters)
      ? (artefact.chapters as Array<{ startSeconds: number; title: string; summary?: string }>).map(
          (chapter) => ({
            start: chapter.startSeconds,
            title: chapter.title,
            summary: chapter.summary,
          }),
        )
      : [];
    patch.processingStatus = 'complete';
    patch.processedAt = new Date();
  }

  await persistVideoRecord(patch as VideoRecord);

  const db = getDb();
  await db
    .update(schema.videos)
    .set({ resourceId, updatedAt: new Date() })
    .where(eq(schema.videos.externalId, videoId));
}

function mapResourceStateToLegacyStatus(state: ResourceProcessingState): string {
  if (state === 'ready') return 'complete';
  if (state === 'failed') return 'failed';
  return mapLegacyVideoProcessingStatus(state);
}
