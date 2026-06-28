import { NextRequest, NextResponse } from 'next/server'

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

    if (!isDevBypass && !process.env.DEV_FORCE_IN_MEMORY) {
      // TODO: integrate real auth/user
    }

    const store = getStore()
    const snip: Snip = {
      id: `snip_${Date.now()}`,
      text,
      codeLang,
      source,
      createdAt: new Date().toISOString(),
    }
    store.push(snip)

    return NextResponse.json({ ok: true, snip })
  } catch (_e) {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

export async function GET() {
  try {
    const store = getStore()
    return NextResponse.json({ snips: store })
  } catch (_e) {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}


