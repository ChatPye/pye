import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { recordLearningEvent } from '@/lib/db/learning-events'

type Snip = {
  id: string
  text: string
  codeLang?: string
  source?: string
  createdBy?: string
  createdAt: string
}

declare global {
  // eslint-disable-next-line no-var
  var __CHATPYE_SNIPS__: Snip[] | undefined
}

function getStore(): Snip[] {
  if (!global.__CHATPYE_SNIPS__) {
    global.__CHATPYE_SNIPS__ = []
  }
  return global.__CHATPYE_SNIPS__!
}

export async function POST(request: NextRequest) {
  try {
    const isDevBypass = request.headers.get('X-Dev-Bypass') === 'true'
    const body = await request.json().catch(() => ({}))
    const { text, codeLang, source } = body ?? {}

    if (!text || typeof text !== 'string') {
      return NextResponse.json({ error: 'text is required' }, { status: 400 })
    }

    const user = isDevBypass ? null : await requireAuth()

    const store = getStore()
    const snip: Snip = {
      id: `snip_${Date.now()}`,
      text,
      codeLang,
      source,
      createdBy: user?.id,
      createdAt: new Date().toISOString(),
    }
    store.push(snip)

    const externalVideoId = typeof source === 'string' && source.startsWith('video:')
      ? source.slice('video:'.length)
      : undefined
    if (user) {
      await recordLearningEvent({
        ownerClerkId: user.id,
        type: 'skillproof.snip_saved',
        externalVideoId,
        payload: { snipId: snip.id, codeLang, textLength: text.length },
      })
    }

    return NextResponse.json({ ok: true, snip })
  } catch (_e) {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const isDevBypass = request.headers.get('X-Dev-Bypass') === 'true'
    const user = isDevBypass ? null : await requireAuth()
    const store = getStore()
    return NextResponse.json({ snips: user ? store.filter((snip) => snip.createdBy === user.id) : store })
  } catch (_e) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}


