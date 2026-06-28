import type { VideoProcessDocument } from '@/data/models/VideoProcess'

const memoryStore = new Map<string, Partial<VideoProcessDocument>>()

export function getMemoryVideo(videoId: string): Partial<VideoProcessDocument> | null {
  const record = memoryStore.get(videoId)
  return record ? { ...record } : null
}

export function upsertMemoryVideo(video: Partial<VideoProcessDocument>): Partial<VideoProcessDocument> {
  if (!video.videoId) {
    throw new Error('videoId is required to upsert a video record')
  }

  const existing = memoryStore.get(video.videoId) || {}
  const merged = {
    ...existing,
    ...video,
    videoId: video.videoId,
  }

  if (!merged.createdAt) {
    (merged as any).createdAt = new Date()
  }
  (merged as any).updatedAt = new Date()

  if (!merged.statusHistory) {
    merged.statusHistory = []
  }

  memoryStore.set(video.videoId, merged)
  return { ...merged }
}

export function updateMemoryVideo(
  videoId: string,
  updater: (record: Partial<VideoProcessDocument>) => Partial<VideoProcessDocument> | void
): Partial<VideoProcessDocument> | null {
  const existing = memoryStore.get(videoId)
  if (!existing) {
    return null
  }

  const draft = { ...existing }
  const result = updater(draft)
  const nextRecord = (result ?? draft) as Partial<VideoProcessDocument>
  (nextRecord as any).updatedAt = new Date()
  memoryStore.set(videoId, nextRecord)
  return { ...nextRecord }
}

export function deleteMemoryVideo(videoId: string): void {
  memoryStore.delete(videoId)
}

export function clearMemoryVideos(): void {
  memoryStore.clear()
}

export function listMemoryVideos(): Array<Partial<VideoProcessDocument>> {
  return Array.from(memoryStore.values()).map((record) => ({ ...record }))
}

export function countMemoryVideosByOwner(ownerId: string, since?: Date): number {
  let count = 0
  const threshold = since ? since.getTime() : undefined
  memoryStore.forEach((record) => {
    if (!record || record.ownerId !== ownerId) return
    if (record.processingStatus === 'failed') return
    if (threshold) {
      const createdAt = (record as any).createdAt instanceof Date
        ? (record as any).createdAt.getTime()
        : record.lastAccessed instanceof Date
          ? record.lastAccessed.getTime()
          : undefined
      if (createdAt && createdAt < threshold) {
        return
      }
    }
    count += 1
  })
  return count
}

