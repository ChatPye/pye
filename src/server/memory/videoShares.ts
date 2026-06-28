export type VideoShareAccess = 'public' | 'invite'

export interface VideoShareRecord {
  shareId: string
  videoId: string
  ownerUserId?: string
  access: VideoShareAccess
  createdAt: number
  expiresAt?: number
}

const memory = new Map<string, VideoShareRecord>()

export function createVideoShare(rec: Omit<VideoShareRecord, 'shareId' | 'createdAt'> & { shareId?: string }) {
  const shareId = rec.shareId || `vshare_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`
  const record: VideoShareRecord = {
    shareId,
    videoId: rec.videoId,
    ownerUserId: rec.ownerUserId,
    access: rec.access,
    createdAt: Date.now(),
    expiresAt: rec.expiresAt,
  }
  memory.set(shareId, record)
  return record
}

export function getVideoShare(shareId: string): VideoShareRecord | null {
  const rec = memory.get(shareId)
  if (!rec) return null
  if (rec.expiresAt && Date.now() > rec.expiresAt) {
    memory.delete(shareId)
    return null
  }
  return rec
}


