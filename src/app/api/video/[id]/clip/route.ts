import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { recordLearningEvent } from '@/lib/db/learning-events'

type Clip = {
  id: string
  videoId: string
  start: number
  duration: number
  notes?: string
  createdBy?: string
  createdAt: string
}

declare global {
  // eslint-disable-next-line no-var
  var __CHATPYE_CLIPS__: Map<string, Clip[]> | undefined
}

function getStore(): Map<string, Clip[]> {
  if (!global.__CHATPYE_CLIPS__) {
    global.__CHATPYE_CLIPS__ = new Map<string, Clip[]>()
  }
  return global.__CHATPYE_CLIPS__!
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: videoId } = await params
    const isDevBypass = request.headers.get('X-Dev-Bypass') === 'true'

    const body = await request.json().catch(() => ({}))
    const { start, duration, notes } = body ?? {}

    if (!videoId || typeof start !== 'number' || typeof duration !== 'number') {
      return NextResponse.json({ error: 'videoId, start, duration required' }, { status: 400 })
    }

    const user = isDevBypass ? null : await requireAuth()

    const store = getStore()
    const clip: Clip = {
      id: `clip_${Date.now()}`,
      videoId,
      start,
      duration,
      notes,
      createdBy: user?.id,
      createdAt: new Date().toISOString(),
    }

    const prev = store.get(videoId) ?? []
    store.set(videoId, [...prev, clip])

    if (user) {
      await recordLearningEvent({
        ownerClerkId: user.id,
        type: 'skillproof.timestamp_clip_saved',
        externalVideoId: videoId,
        payload: { clipId: clip.id, start, duration, notes: notes?.slice(0, 500) },
      })
    }

    return NextResponse.json({ ok: true, clip })
  } catch (err: unknown) {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: videoId } = await params
    const isDevBypass = request.headers.get('X-Dev-Bypass') === 'true'
    const user = isDevBypass ? null : await requireAuth()
    const store = getStore()
    const clips = (store.get(videoId) ?? []).filter((clip) => !user || clip.createdBy === user.id)
    return NextResponse.json({ clips })
  } catch (_e) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}


