import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { ApiError, apiErrorResponse } from '@/lib/api/errors';
import { requireAurora } from '@/lib/db/require-aurora';
import { enqueueResourceProcessingJob } from '@/lib/queue/resource-processing-queue';
import {
  createResource,
  createResourceProcessingJob,
  findResourceByLegacyExternalId,
  findResourceByOwnerAndSourceRef,
  transitionResourceState,
} from '@/lib/db/resource-repository';
import {
  isGeminiYoutubeConfigured,
  parseYoutubeImportInput,
} from '@/lib/resources/youtube-import';
import { isUserVisibleReadyState } from '@/lib/resources/state-machine';
import { persistVideoRecord } from '@/lib/db/video-repository';
import { recordLearningEvent } from '@/lib/db/learning-events';

export const dynamic = 'force-dynamic';

type ImportResponse = {
  resourceId: string;
  jobId: string;
  processingState: string;
  legacyVideoId: string;
  queuedVia: 'sqs' | 'local';
  existing?: boolean;
};

export async function POST(request: NextRequest) {
  try {
    requireAurora('YouTube import');
    if (!isGeminiYoutubeConfigured()) {
      throw new ApiError(
        'PROVIDER_ERROR',
        'YouTube import requires Gemini to be configured (GEMINI_API_KEY and FEATURE_GEMINI_YOUTUBE).',
        503,
      );
    }

    const authUser = await requireAuth();
    const body = await request.json();
    const parsed = parseYoutubeImportInput(body.url ?? body.youtubeUrl ?? body.videoId);

    const existingByLegacy = await findResourceByLegacyExternalId(parsed.videoId);
    if (existingByLegacy) {
      if (isUserVisibleReadyState(existingByLegacy.processingState)) {
        return NextResponse.json<ImportResponse>(
          {
            resourceId: existingByLegacy.id,
            jobId: '',
            processingState: existingByLegacy.processingState,
            legacyVideoId: parsed.videoId,
            queuedVia: 'local',
            existing: true,
          },
          { status: 200 },
        );
      }

      if (existingByLegacy.processingState === 'failed') {
        await transitionResourceState(existingByLegacy.id, 'queued');
        const job = await createResourceProcessingJob({
          resourceId: existingByLegacy.id,
          state: 'queued',
          provider: 'gemini',
        });
        const queuedVia = await enqueueResourceProcessingJob({
          resourceId: existingByLegacy.id,
          jobId: job.id,
          sourceType: 'youtube',
          ownerUserId: authUser.id,
        });
        return NextResponse.json<ImportResponse>(
          {
            resourceId: existingByLegacy.id,
            jobId: job.id,
            processingState: 'queued',
            legacyVideoId: parsed.videoId,
            queuedVia,
            existing: true,
          },
          { status: 202 },
        );
      }

      return NextResponse.json<ImportResponse>(
        {
          resourceId: existingByLegacy.id,
          jobId: '',
          processingState: existingByLegacy.processingState,
          legacyVideoId: parsed.videoId,
          queuedVia: 'local',
          existing: true,
        },
        { status: 202 },
      );
    }

    const existingBySource = await findResourceByOwnerAndSourceRef(authUser.id, parsed.sourceRef);
    if (existingBySource && existingBySource.processingState !== 'failed') {
      return NextResponse.json<ImportResponse>(
        {
          resourceId: existingBySource.id,
          jobId: '',
          processingState: existingBySource.processingState,
          legacyVideoId: parsed.videoId,
          queuedVia: 'local',
          existing: true,
        },
        { status: isUserVisibleReadyState(existingBySource.processingState) ? 200 : 202 },
      );
    }

    const resource = await createResource({
      ownerUserId: authUser.id,
      sourceType: 'youtube',
      sourceRef: parsed.sourceRef,
      title: `YouTube tutorial ${parsed.videoId}`,
      legacyExternalId: parsed.videoId,
      displayMetadata: { youtubeVideoId: parsed.videoId },
    });

    await transitionResourceState(resource.id, 'validating');
    await transitionResourceState(resource.id, 'queued');

    const job = await createResourceProcessingJob({
      resourceId: resource.id,
      state: 'queued',
      provider: 'gemini',
    });

    await persistVideoRecord({
      videoId: parsed.videoId,
      ownerId: authUser.id,
      source: 'youtube',
      title: resource.title,
      videoUrl: parsed.sourceRef,
      processingStatus: 'queued',
    });

    const queuedVia = await enqueueResourceProcessingJob({
      resourceId: resource.id,
      jobId: job.id,
      sourceType: 'youtube',
      ownerUserId: authUser.id,
    });

    await recordLearningEvent({
      ownerClerkId: authUser.id,
      type: 'resource.import',
      externalVideoId: parsed.videoId,
      payload: { resourceId: resource.id, sourceType: 'youtube' },
    });

    return NextResponse.json<ImportResponse>(
      {
        resourceId: resource.id,
        jobId: job.id,
        processingState: 'queued',
        legacyVideoId: parsed.videoId,
        queuedVia,
      },
      { status: 202 },
    );
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'INVALID_YOUTUBE_URL' || error.message === 'YOUTUBE_URL_REQUIRED') {
        return apiErrorResponse(
          new ApiError('VALIDATION_ERROR', 'Provide a valid public YouTube URL.', 400),
        );
      }
    }
    return apiErrorResponse(error);
  }
}
