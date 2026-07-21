import type { ProcessingStatus } from '@/data/models/VideoProcess';
import { generateEmbeddings } from '@/lib/bedrock-embeddings';
import { generateSummary } from '@/lib/bedrock-summary';
import { generateChaptersFromTranscript } from '@/lib/chapter-generation';
import { audioTranscriptionService } from '@/lib/audio-transcription';
import { fetchYouTubeTranscript } from '@/lib/video/transcript';
import { fetchYouTubeMetadata } from '@/lib/video/metadata';
import { logger } from '@/lib/logger';
import {
  findVideoByExternalId,
  persistVideoRecord,
  updateVideoStatus,
  updateVideoTranscript,
  updateVideoProcessingResult,
} from '@/lib/db/video-repository';
import type { VideoRecord } from '@/lib/db/video-types';
import { prepareTranscriptionMedia } from '@/lib/video/media-prep';

const EMBED_BATCH = 40;

export type ProcessingJobPayload = {
  videoId: string;
  ownerId: string | null;
  source: 'youtube' | 'upload';
  /** Backend worker bypasses short client lock */
  force?: boolean;
};

type ProcessingMeta = {
  transcribeJobId?: string;
  transcriptionS3Key?: string;
  audioExtracted?: boolean;
  embeddingOffset?: number;
  useConsolidated?: boolean;
  phase?: 'embed' | 'summarize';
  tickLockUntil?: number;
};

function consolidateForEmbedding(
  segments: Array<{ text: string; start: number; duration: number }>,
  maxSegments = 400
): Array<{ text: string; start: number; duration: number }> {
  if (segments.length <= maxSegments) return segments;
  const groupSize = Math.ceil(segments.length / maxSegments);
  const merged: Array<{ text: string; start: number; duration: number }> = [];
  for (let i = 0; i < segments.length; i += groupSize) {
    const chunk = segments.slice(i, i + groupSize);
    const start = chunk[0]?.start ?? 0;
    const end = chunk[chunk.length - 1];
    const endTime = (end?.start ?? start) + (end?.duration ?? 0);
    merged.push({
      text: chunk.map((s) => s.text).join(' '),
      start,
      duration: Math.max(1, endTime - start),
    });
  }
  return merged;
}

function embeddingSegments(
  record: VideoRecord,
  meta: ProcessingMeta
): Array<{ text: string; start: number; duration: number }> {
  const full = record.transcript ?? [];
  if (!full.length) return [];
  if (meta.useConsolidated || full.length > 500) {
    return consolidateForEmbedding(full, 400);
  }
  return full;
}

function parseMeta(transcriptRef?: string | null): ProcessingMeta {
  if (!transcriptRef) return {};
  try {
    if (transcriptRef.trim().startsWith('{')) {
      return JSON.parse(transcriptRef) as ProcessingMeta;
    }
    return { transcribeJobId: transcriptRef };
  } catch {
    return {};
  }
}

function serializeMeta(meta: ProcessingMeta): string {
  return JSON.stringify(meta);
}

async function saveMeta(videoId: string, record: VideoRecord, meta: ProcessingMeta) {
  await persistVideoRecord({
    ...record,
    videoId,
    transcriptRef: serializeMeta(meta),
  });
}

/** Kick off processing — mark pending only; client/cron ticks advance stages. */
export async function startVideoProcessing(payload: ProcessingJobPayload): Promise<void> {
  const record = await findVideoByExternalId(payload.videoId);
  if (!record) return;
  if (record.processingStatus === 'complete' || record.processingStatus === 'failed') return;
  if (record.processingStatus === 'queued' || !record.processingStatus) {
    await updateVideoStatus(payload.videoId, 'pending');
  }
}

/** Advance one processing stage — safe to call repeatedly from client polls. */
export async function advanceVideoProcessing(
  payload: ProcessingJobPayload
): Promise<{ status: ProcessingStatus; error?: string; progress?: number }> {
  const { videoId, source, force = false } = payload;
  let record = await findVideoByExternalId(videoId);

  if (!record) {
    return { status: 'failed', error: 'Video not found' };
  }

  const status = (record.processingStatus || 'queued') as ProcessingStatus;

  if (status === 'complete') {
    return { status: 'complete', progress: 100 };
  }

  if (status === 'failed') {
    return { status: 'failed', error: record.errorMessage || 'Processing failed', progress: 0 };
  }

  const meta = parseMeta(record.transcriptRef ?? null);
  const lockUntil = meta.tickLockUntil ?? 0;
  if (!force && lockUntil > Date.now()) {
    return {
      status,
      progress: progressFor(status),
    };
  }

  if (!force) {
    // Workspace polling advances one bounded stage at a time. Keep this short so
    // a learner sees progress without allowing concurrent requests to overlap.
    const lockMeta = { ...meta, tickLockUntil: Date.now() + 8_000 };
    await saveMeta(videoId, record, lockMeta);
  }

  try {
    if (source === 'youtube') {
      return await advanceYouTubeProcessing(videoId, record);
    }
    return await advanceUploadProcessing(videoId, record);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Processing error';
    logger.error('Processing tick failed', error instanceof Error ? error : new Error(message), {
      videoId,
    });
    await updateVideoStatus(videoId, 'failed', message);
    return { status: 'failed', error: message };
  } finally {
    if (!force) {
      const latest = await findVideoByExternalId(videoId);
      if (latest) {
        const cleared = { ...parseMeta(latest.transcriptRef ?? null), tickLockUntil: 0 };
        await saveMeta(videoId, latest, cleared);
      }
    }
  }
}

async function advanceYouTubeProcessing(
  videoId: string,
  record: VideoRecord
): Promise<{ status: ProcessingStatus; progress?: number; error?: string }> {
  const status = record.processingStatus || 'queued';

  if (status === 'queued' || status === 'pending') {
    await updateVideoStatus(videoId, 'transcribing');
    const ytTranscript = await fetchYouTubeTranscript(videoId);
    if (ytTranscript?.length) {
      await updateVideoTranscript(videoId, ytTranscript);
      await updateVideoStatus(videoId, 'embedding');
      record = (await findVideoByExternalId(videoId))!;
      return advanceYouTubeProcessing(videoId, record);
    }
    await updateVideoStatus(videoId, 'failed', 'YouTube transcript unavailable');
    return { status: 'failed', error: 'YouTube transcript unavailable' };
  }

  if (status === 'transcribing') {
    /* handled above */
  }

  if (status === 'embedding') {
    return finishEmbeddingsAndSummary(videoId, record);
  }

  return { status: status as ProcessingStatus, progress: progressFor(status) };
}

async function advanceUploadProcessing(
  videoId: string,
  record: VideoRecord
): Promise<{ status: ProcessingStatus; progress?: number; error?: string }> {
  let status = (record.processingStatus || 'queued') as ProcessingStatus;
  let meta = parseMeta(record.transcriptRef ?? null);

  // Recover: job already started but status not yet transcribing
  if (meta.transcribeJobId && (status === 'queued' || status === 'pending' || status === 'extracting')) {
    await updateVideoStatus(videoId, 'transcribing');
    record = (await findVideoByExternalId(videoId))!;
    status = 'transcribing';
    meta = parseMeta(record.transcriptRef ?? null);
  }

  // Phase 1 — prepare media + start AWS Transcribe (idempotent)
  if ((status === 'queued' || status === 'pending' || status === 'extracting') && !meta.transcribeJobId) {
    await updateVideoStatus(videoId, 'extracting');
    const s3Key = record.s3Key;
    if (!s3Key) {
      await updateVideoStatus(videoId, 'failed', 'No S3 file for this upload');
      return { status: 'failed', error: 'No S3 file for this upload' };
    }

    if (!meta.transcriptionS3Key) {
      const prep = await prepareTranscriptionMedia(videoId, s3Key);
      meta.transcriptionS3Key = prep.transcriptionKey;
      meta.audioExtracted = prep.usedAudioExtract;
      await saveMeta(videoId, record, meta);
    }

    const jobId = await audioTranscriptionService.startJobForS3Key(
      videoId,
      meta.transcriptionS3Key,
      { fastMode: true }
    );
    meta.transcribeJobId = jobId;
    meta.embeddingOffset = 0;
    await updateVideoStatus(videoId, 'transcribing');
    await saveMeta(videoId, record, meta);
    record = (await findVideoByExternalId(videoId))!;
    status = 'transcribing';
    meta = parseMeta(record.transcriptRef ?? null);
  }

  // Phase 2 — poll Transcribe (wait up to ~2 min per tick so short videos finish in one request)
  if (status === 'transcribing') {
    if (!meta.transcribeJobId) {
      await updateVideoStatus(videoId, 'failed', 'Missing transcription job');
      return { status: 'failed', error: 'Missing transcription job' };
    }

    const poll = await audioTranscriptionService.pollJobUntilDone(meta.transcribeJobId, {
      maxWaitMs: 50_000,
      pollIntervalMs: 3_000,
    });

    if (poll.status === 'pending') {
      const elapsed = poll.waitedMs ?? 0;
      const progress = 40 + Math.min(14, Math.floor(elapsed / 8000));
      return { status: 'transcribing', progress };
    }

    if (poll.status === 'failed') {
      await updateVideoStatus(videoId, 'failed', poll.error || 'Transcription failed');
      return { status: 'failed', error: poll.error || 'Transcription failed' };
    }

    const segments = poll.segments?.length
      ? poll.segments
      : poll.text
        ? poll.text
            .split('.')
            .map((sentence, index) => ({
              text: sentence.trim(),
              start: index * 5,
              duration: 5,
            }))
            .filter((s) => s.text.length > 0)
        : [];

    if (!segments.length) {
      await updateVideoStatus(videoId, 'failed', 'Empty transcript');
      return { status: 'failed', error: 'Empty transcript' };
    }

    await updateVideoTranscript(videoId, segments);
    const last = segments[segments.length - 1];
    await persistVideoRecord({
      ...record,
      videoId,
      duration: Math.ceil(last.start + (last.duration || 0)),
      processingStatus: 'embedding',
      transcriptRef: serializeMeta({ ...meta, embeddingOffset: 0, phase: 'embed' }),
    });
    record = (await findVideoByExternalId(videoId))!;
    return advanceUploadProcessing(videoId, record);
  }

  if (status === 'embedding') {
    return finishEmbeddingsAndSummary(videoId, record);
  }

  return { status: status as ProcessingStatus, progress: progressFor(status) };
}

async function finishEmbeddingsAndSummary(
  videoId: string,
  record: VideoRecord
): Promise<{ status: ProcessingStatus; progress?: number; error?: string }> {
  const meta = parseMeta(record.transcriptRef ?? null);
  const fullTranscript = record.transcript ?? [];
  const segments = embeddingSegments(record, meta);
  const offset = meta.embeddingOffset ?? 0;

  if (!fullTranscript.length) {
    await updateVideoStatus(videoId, 'failed', 'No transcript segments');
    return { status: 'failed', error: 'No transcript segments' };
  }

  if (meta.phase !== 'summarize') {
    if (offset < segments.length) {
      const batch = segments.slice(offset, offset + EMBED_BATCH);
      const batchEmbeddings = await generateEmbeddings(batch);
      const existing = record.embeddings ?? [];
      const merged = [...existing, ...batchEmbeddings];
      const nextOffset = offset + batch.length;
      const embedMeta: ProcessingMeta = {
        ...meta,
        embeddingOffset: nextOffset,
        useConsolidated: segments.length < fullTranscript.length ? true : meta.useConsolidated,
        phase: 'embed',
      };

      await persistVideoRecord({
        ...record,
        videoId,
        embeddings: merged,
        processingStatus: 'embedding',
        transcriptRef: serializeMeta(embedMeta),
      });

      const progress = 55 + Math.round((nextOffset / segments.length) * 30);
      if (nextOffset < segments.length) {
        return { status: 'embedding', progress };
      }

      record = (await findVideoByExternalId(videoId))!;
      meta.embeddingOffset = nextOffset;
      meta.phase = 'summarize';
      await saveMeta(videoId, record, meta);
      return { status: 'embedding', progress: 88 };
    }

    meta.phase = 'summarize';
    await saveMeta(videoId, record, meta);
    return { status: 'embedding', progress: 88 };
  }

  let summaryResult;
  try {
    summaryResult = await generateSummary(fullTranscript);
  } catch {
    summaryResult = {
      title: record.title || 'Video session',
      summary: record.description || '',
      keyPoints: [] as string[],
    };
  }

  let chapters: Array<{ start: number; title: string; summary?: string }> = [];
  try {
    chapters = await generateChaptersFromTranscript(fullTranscript, record.duration);
  } catch {
    chapters = [];
  }

  const metadataUpdates: Partial<VideoRecord> = {
    title: summaryResult.title || record.title,
    description: summaryResult.summary || record.description,
  };

  if (record.source === 'youtube') {
    try {
      const ytMeta = await fetchYouTubeMetadata(videoId);
      if (ytMeta.title) metadataUpdates.title = ytMeta.title;
      if (ytMeta.author) metadataUpdates.channel = ytMeta.author;
      if (ytMeta.thumbnail) metadataUpdates.thumbnail = ytMeta.thumbnail;
      if (ytMeta.durationSeconds) metadataUpdates.duration = ytMeta.durationSeconds;
    } catch {
      /* optional */
    }
  }

  record = (await findVideoByExternalId(videoId))!;

  await updateVideoProcessingResult(videoId, {
    embeddings: record.embeddings ?? [],
    summary: summaryResult.summary,
    keyPoints: summaryResult.keyPoints,
    transcript: fullTranscript,
    chapters,
    ...metadataUpdates,
    processingStatus: 'complete',
    processedAt: new Date(),
  });

  await updateVideoStatus(videoId, 'complete');
  return { status: 'complete', progress: 100 };
}

function progressFor(status: ProcessingStatus): number {
  const map: Record<string, number> = {
    queued: 10,
    pending: 15,
    extracting: 25,
    transcribing: 45,
    embedding: 75,
    complete: 100,
    failed: 0,
  };
  return map[status] ?? 20;
}

/** Progress for job status API (uses meta when available). */
export function computeVideoProgress(record: {
  processingStatus?: string | null;
  transcriptRef?: string | null;
  transcript?: unknown[] | null;
}): number {
  const status = (record.processingStatus || 'queued') as ProcessingStatus;
  if (status === 'complete') return 100;
  if (status === 'failed') return 0;

  let meta: ProcessingMeta = {};
  if (record.transcriptRef?.trim().startsWith('{')) {
    try {
      meta = JSON.parse(record.transcriptRef) as ProcessingMeta;
    } catch {
      meta = {};
    }
  }

  if (status === 'transcribing') return 40;
  if (status === 'embedding' && meta.embeddingOffset != null) {
    const transcriptLen = record.transcript?.length ?? 0;
    if (transcriptLen > 0) {
      return 55 + Math.min(33, Math.round((meta.embeddingOffset / transcriptLen) * 33));
    }
    return 72;
  }

  return progressFor(status);
}

export { progressFor as processingProgressFor };
