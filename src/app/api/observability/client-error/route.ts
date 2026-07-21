import { NextRequest, NextResponse } from 'next/server'
import { logger } from '@/lib/logger'

/** Receives redacted browser failures so Vercel logs show the real workspace crash. */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as Record<string, unknown>
    const incidentId = typeof body.incidentId === 'string' ? body.incidentId.slice(0, 80) : 'unknown'
    const message = typeof body.message === 'string' ? body.message.slice(0, 1500) : 'Unknown client error'
    const pathname = typeof body.pathname === 'string' ? body.pathname.slice(0, 500) : ''
    const componentStack = typeof body.componentStack === 'string' ? body.componentStack.slice(0, 4000) : ''
    logger.error('Client workspace error', new Error(message), { incidentId, pathname, componentStack })
    return NextResponse.json({ success: true, incidentId })
  } catch {
    return NextResponse.json({ success: false }, { status: 400 })
  }
}
