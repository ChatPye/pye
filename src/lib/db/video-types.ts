import type {
  ProcessingStatus,
  VideoProcessDocument,
} from '@/data/models/VideoProcess'

export type TranscriptSegment = {
  text: string
  start: number
  duration: number
}

export type EmbeddingSegment = TranscriptSegment & {
  embedding?: number[]
  vector?: number[]
}

export type VideoRecord = Partial<VideoProcessDocument> & {
  videoId: string
}

export function processingStatusToDbStatus(
  processingStatus: ProcessingStatus | string | undefined
): 'uploading' | 'processing' | 'ready' | 'failed' {
  if (processingStatus === 'complete') return 'ready'
  if (processingStatus === 'failed') return 'failed'
  if (
    processingStatus === 'queued' ||
    processingStatus === 'uploading'
  ) {
    return 'uploading'
  }
  return 'processing'
}

export function rowToVideoRecord(row: {
  externalId: string
  ownerClerkId: string | null
  source: string | null
  title: string
  description: string | null
  channel: string | null
  s3Key: string | null
  videoUrl: string | null
  youtubeVideoId: string | null
  processingStatus: string | null
  durationSeconds: number | null
  thumbnailUrl: string | null
  transcript: TranscriptSegment[] | null
  embeddings: EmbeddingSegment[] | null
  chapters: Array<{ start: number; title: string; summary?: string }> | null
  summary: string | null
  keyPoints: string[] | null
  errorMessage: string | null
  statusHistory: Array<{ status: string; updatedAt: string }> | null
  accessCount: number | null
  lastAccessed: Date | null
  processedAt: Date | null
  publishedLabel: string | null
  transcriptRef: string | null
  createdAt: Date
  updatedAt: Date
}): VideoRecord {
  return {
    videoId: row.externalId,
    ownerId: row.ownerClerkId,
    source: (row.source as VideoRecord['source']) || 'upload',
    title: row.title,
    channel: row.channel || '',
    description: row.description || '',
    duration: row.durationSeconds ?? 0,
    thumbnail: row.thumbnailUrl || '',
    s3Key: row.s3Key ?? undefined,
    videoUrl: row.videoUrl ?? undefined,
    published: row.publishedLabel || row.createdAt.toISOString(),
    transcript: row.transcript ?? [],
    embeddings: (row.embeddings ?? []).map((e) => ({
      text: e.text,
      start: e.start,
      duration: e.duration,
      embedding: e.embedding ?? e.vector ?? [],
    })),
    chapters: row.chapters ?? [],
    summary: row.summary || '',
    keyPoints: row.keyPoints ?? [],
    transcriptRef: row.transcriptRef ?? undefined,
    processingStatus: (row.processingStatus as ProcessingStatus) || 'queued',
    errorMessage: row.errorMessage ?? undefined,
    statusHistory: (row.statusHistory ?? []).map((entry) => ({
      status: entry.status as ProcessingStatus,
      updatedAt: new Date(entry.updatedAt),
    })),
    accessCount: row.accessCount ?? 0,
    lastAccessed: row.lastAccessed ?? row.createdAt,
    processedAt: row.processedAt ?? undefined,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }
}

export function videoRecordToInsert(
  record: VideoRecord
): typeof import('./schema').videos.$inferInsert {
  const processingStatus = record.processingStatus || 'queued'
  return {
    externalId: record.videoId,
    ownerClerkId: record.ownerId ?? null,
    source: record.source || 'upload',
    title: record.title || `Video ${record.videoId}`,
    description: record.description ?? null,
    channel: record.channel ?? null,
    s3Key: record.s3Key ?? null,
    videoUrl: record.videoUrl ?? null,
    youtubeVideoId:
      record.source === 'youtube' ? record.videoId.slice(0, 20) : null,
    status: processingStatusToDbStatus(processingStatus),
    processingStatus,
    durationSeconds: record.duration ?? 0,
    thumbnailUrl: record.thumbnail ?? null,
    transcript: record.transcript ?? [],
    embeddings: record.embeddings ?? [],
    chapters: record.chapters ?? [],
    summary: record.summary ?? null,
    keyPoints: record.keyPoints ?? [],
    errorMessage: record.errorMessage ?? null,
    transcriptRef: record.transcriptRef ?? null,
    statusHistory: (record.statusHistory ?? []).map((entry) => ({
      status: entry.status,
      updatedAt:
        entry.updatedAt instanceof Date
          ? entry.updatedAt.toISOString()
          : String(entry.updatedAt),
    })),
    accessCount: record.accessCount ?? 0,
    lastAccessed: record.lastAccessed
      ? record.lastAccessed instanceof Date
        ? record.lastAccessed
        : new Date(record.lastAccessed)
      : new Date(),
    processedAt: record.processedAt
      ? record.processedAt instanceof Date
        ? record.processedAt
        : new Date(record.processedAt)
      : null,
    publishedLabel: record.published ?? null,
  }
}
