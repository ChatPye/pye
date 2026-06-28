export type PodShareAccess = 'public' | 'invite'

export interface PodShareRecord {
  shareId: string
  podId: string
  ownerUserId?: string
  access: PodShareAccess
  createdAt: number
  expiresAt?: number
}

const memory = new Map<string, PodShareRecord>()

export function createPodShare(rec: Omit<PodShareRecord, 'shareId' | 'createdAt'> & { shareId?: string }) {
  const shareId = rec.shareId || `pshare_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`
  const record: PodShareRecord = {
    shareId,
    podId: rec.podId,
    ownerUserId: rec.ownerUserId,
    access: rec.access,
    createdAt: Date.now(),
    expiresAt: rec.expiresAt,
  }
  memory.set(shareId, record)
  return record
}

export function getPodShare(shareId: string): PodShareRecord | null {
  const rec = memory.get(shareId)
  if (!rec) return null
  if (rec.expiresAt && Date.now() > rec.expiresAt) {
    memory.delete(shareId)
    return null
  }
  return rec
}


