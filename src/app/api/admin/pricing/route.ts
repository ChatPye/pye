import { NextRequest, NextResponse } from 'next/server'
import { getPricing } from '@/lib/pricing'

export async function GET() {
  return NextResponse.json({ plans: getPricing() })
}

export async function PUT(request: NextRequest) {
  try {
    const isDevBypass = request.headers.get('X-Dev-Bypass') === 'true'
    if (!isDevBypass && !process.env.DEV_FORCE_IN_MEMORY) {
      // TODO: require admin auth via Clerk
    }
    const body = await request.json().catch(() => ({}))
    const { key, price, currency } = body ?? {}
    if (!key || typeof price !== 'number' || !currency) {
      return NextResponse.json({ error: 'key, price, currency required' }, { status: 400 })
    }
    const plans = getPricing()
    if (!plans[key]) {
      return NextResponse.json({ error: 'unknown plan key' }, { status: 404 })
    }
    plans[key] = { ...plans[key], price, currency }
    return NextResponse.json({ ok: true, plan: plans[key] })
  } catch (_e) {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}


