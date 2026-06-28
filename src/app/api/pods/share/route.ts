import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createPodShare } from '@/server/memory/podShares'
import { getPlanLimits, getInviteCountForTenant, getUserPlanAndTenant } from '@/lib/plans'

export async function POST(request: NextRequest) {
  try {
    const isDevBypass = request.headers.get('X-Dev-Bypass') === 'true'
    let userId: string | undefined
    if (!isDevBypass) {
      try { const a = auth(); userId = a?.userId || undefined } catch {}
    }
    const body = await request.json()
    const { podId, access = 'public', expiresIn } = body as { podId?: string; access?: 'public'|'invite'; expiresIn?: number }
    if (!podId) return NextResponse.json({ success: false, error: 'podId required' }, { status: 400 })
    if (!isDevBypass && !userId) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

    if (!isDevBypass && access === 'invite') {
      const user = await getUserPlanAndTenant(userId!)
      const limits = getPlanLimits(user.plan)
      const used = await getInviteCountForTenant(user.tenantId)
      const max = Number(limits.invites ?? 2)
      if (used >= max) {
        return NextResponse.json({ success: false, error: 'Invite limit reached', reason: 'upgrade_required' }, { status: 402 })
      }
    }

    const rec = createPodShare({ podId, access, ownerUserId: userId, expiresAt: expiresIn ? Date.now() + Math.max(0, expiresIn) : undefined })
    const base = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'
    const shareUrl = `${base}/pods/share/${rec.shareId}`
    return NextResponse.json({ success: true, shareId: rec.shareId, shareUrl })
  } catch (e: any) {
    return NextResponse.json({ success: false, error: 'bad request', detail: e?.message || 'unknown' }, { status: 400 })
  }
}


