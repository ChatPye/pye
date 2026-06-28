import { NextRequest, NextResponse } from 'next/server'

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

    // In production, require auth unless explicitly bypassed in dev
    if (!isDevBypass && !process.env.DEV_FORCE_IN_MEMORY) {
      // TODO: integrate real auth/user
    }

    const store = getStore()
    const clip: Clip = {
      id: `clip_${Date.now()}`,
      videoId,
      start,
      duration,
      notes,
      createdAt: new Date().toISOString(),
    }

    const prev = store.get(videoId) ?? []
    store.set(videoId, [...prev, clip])

    return NextResponse.json({ ok: true, clip })
  } catch (err: unknown) {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: videoId } = await params
    const store = getStore()
    const clips = store.get(videoId) ?? []
    return NextResponse.json({ clips })
  } catch (_e) {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}


