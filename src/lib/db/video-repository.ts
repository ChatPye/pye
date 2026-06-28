import { eq, and, gte, ne, sql } from 'drizzle-orm'
import { connectDocumentDB } from '@/server/db/documentdb'
import { VideoProcess } from '@/data/models/VideoProcess'
import type { ProcessingStatus } from '@/data/models/VideoProcess'
import {
  getMemoryVideo,
  upsertMemoryVideo,
  updateMemoryVideo,
  countMemoryVideosByOwner,
} from '@/data/stores/videoMemoryStore'
import { getDb, isDatabaseConfigured, schema } from '@/lib/db'
import {
  processingStatusToDbStatus,
  rowToVideoRecord,
  videoRecordToInsert,
  type VideoRecord,
} from '@/lib/db/video-types'
import { logger } from '@/lib/logger'

export function useAuroraForVideos(): boolean {
  return isDatabaseConfigured() && process.env.DEV_FORCE_IN_MEMORY !== 'true'
}

async function useMongoForVideos(): Promise<boolean> {
  if (useAuroraForVideos()) return false
  if (process.env.DEV_FORCE_IN_MEMORY === 'true') return false
  const db = await connectDocumentDB()
  return Boolean(db)
}

export async function findVideoByExternalId(
  videoId: string
): Promise<VideoRecord | null> {
  if (useAuroraForVideos()) {
    try {
      const db = getDb()
      const [row] = await db
        .select()
        .from(schema.videos)
        .where(eq(schema.videos.externalId, videoId))
        .limit(1)
      return row ? rowToVideoRecord(row) : null
    } catch (error) {
      logger.error(
        'Aurora findVideo failed',
        error instanceof Error ? error : new Error(String(error)),
        { videoId }
      )
    }
  }

  if (await useMongoForVideos()) {
    const doc = await VideoProcess.findOne({ videoId }).lean()
    if (doc) return doc as unknown as VideoRecord
  }

  const memory = getMemoryVideo(videoId)
  return memory?.videoId ? (memory as VideoRecord) : null
}

export async function persistVideoRecord(
  record: VideoRecord
): Promise<VideoRecord> {
  if (!record.videoId) {
    throw new Error('videoId is required')
  }

  if (useAuroraForVideos()) {
    const db = getDb()
    const existing = await findVideoByExternalId(record.videoId)
    const payload = videoRecordToInsert({ ...existing, ...record, videoId: record.videoId })

    if (existing) {
      await db
        .update(schema.videos)
        .set({ ...payload, updatedAt: new Date() })
        .where(eq(schema.videos.externalId, record.videoId))
    } else {
      await db.insert(schema.videos).values(payload)
    }

    return (await findVideoByExternalId(record.videoId)) as VideoRecord
  }

  if (await useMongoForVideos()) {
    const existing = await VideoProcess.findOne({ videoId: record.videoId })
    if (existing) {
      Object.assign(existing, record)
      await existing.save()
      return existing.toObject() as VideoRecord
    }
    const created = new VideoProcess(record)
    await created.save()
    return created.toObject() as VideoRecord
  }

  return upsertMemoryVideo(record) as VideoRecord
}

export async function updateVideoStatus(
  videoId: string,
  status: ProcessingStatus,
  errorMessage?: string
): Promise<VideoRecord | null> {
  const existing = await findVideoByExternalId(videoId)
  if (!existing) return null

  const statusEntry = { status, updatedAt: new Date() }
  const history = [...(existing.statusHistory ?? []), statusEntry]

  return persistVideoRecord({
    ...existing,
    videoId,
    processingStatus: status,
    errorMessage,
    statusHistory: history,
  })
}

export async function updateVideoTranscript(
  videoId: string,
  transcript: VideoRecord['transcript']
): Promise<VideoRecord | null> {
  const existing = await findVideoByExternalId(videoId)
  if (!existing) return null
  return persistVideoRecord({ ...existing, videoId, transcript: transcript ?? [] })
}

export async function updateVideoProcessingResult(
  videoId: string,
  result: Partial<VideoRecord>
): Promise<VideoRecord | null> {
  const existing = await findVideoByExternalId(videoId)
  if (!existing) return null

  const merged = persistVideoRecord({
    ...existing,
    ...result,
    videoId,
    processingStatus: result.processingStatus ?? 'complete',
  })

  if (useAuroraForVideos() && result.embeddings?.length) {
    try {
      const db = getDb()
      const [videoRow] = await db
        .select({ id: schema.videos.id })
        .from(schema.videos)
        .where(eq(schema.videos.externalId, videoId))
        .limit(1)

      if (videoRow) {
        await db
          .delete(schema.videoSegments)
          .where(eq(schema.videoSegments.videoId, videoRow.id))

        const segments = result.embeddings ?? result.transcript ?? []
        if (segments.length > 0) {
          await db.insert(schema.videoSegments).values(
            segments.map((seg) => ({
              videoId: videoRow.id,
              startMs: Math.round((seg.start ?? 0) * 1000),
              endMs: Math.round(((seg.start ?? 0) + (seg.duration ?? 0)) * 1000),
              text: seg.text,
              embedding: (seg as { embedding?: number[] }).embedding ?? null,
            }))
          )
        }
      }
    } catch (error) {
      logger.warn('Failed to sync video_segments', {
        videoId,
        error: error instanceof Error ? error.message : String(error),
      })
    }
  }

  return merged
}

export async function incrementVideoAccess(videoId: string): Promise<VideoRecord | null> {
  const existing = await findVideoByExternalId(videoId)
  if (!existing) return null
  return persistVideoRecord({
    ...existing,
    videoId,
    accessCount: (existing.accessCount ?? 0) + 1,
    lastAccessed: new Date(),
  })
}

export async function countVideosByOwnerSince(
  ownerClerkId: string,
  since: Date
): Promise<number> {
  if (useAuroraForVideos()) {
    try {
      const db = getDb()
      const [result] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(schema.videos)
        .where(
          and(
            eq(schema.videos.ownerClerkId, ownerClerkId),
            gte(schema.videos.createdAt, since),
            ne(schema.videos.processingStatus, 'failed')
          )
        )
      return result?.count ?? 0
    } catch {
      return 0
    }
  }

  if (await useMongoForVideos()) {
    return VideoProcess.countDocuments({
      ownerId: ownerClerkId,
      createdAt: { $gte: since },
      processingStatus: { $ne: 'failed' },
    })
  }

  return countMemoryVideosByOwner(ownerClerkId, since)
}

export async function getVideoForSearch(videoId: string): Promise<VideoRecord | null> {
  return findVideoByExternalId(videoId)
}

export { processingStatusToDbStatus }
