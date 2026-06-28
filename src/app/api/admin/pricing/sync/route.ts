import { NextRequest, NextResponse } from 'next/server'

// Placeholder Stripe sync endpoint: accepts plan config and responds OK.
// In production, map to Stripe Product/Price and persist IDs.

export async function POST(request: NextRequest) {
  try {
    const isDevBypass = request.headers.get('X-Dev-Bypass') === 'true'
    if (!isDevBypass && !process.env.DEV_FORCE_IN_MEMORY) {
      // TODO: require admin auth via Clerk
    }
    const body = await request.json().catch(() => ({}))
    if (!body || !body.key) {
      return NextResponse.json({ error: 'plan key required' }, { status: 400 })
    }
    // TODO: integrate with Stripe: create/update Product and Price, store IDs
    return NextResponse.json({ ok: true, synced: body.key })
  } catch (_e) {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}


