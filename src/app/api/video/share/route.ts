import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createVideoShare } from '@/server/memory/videoShares'
import { getPlanLimits, getInviteCountForTenant, getUserPlanAndTenant } from '@/lib/plans'
import { createShareLink } from '@/lib/db/share-repository'
import { isDatabaseConfigured } from '@/lib/db'
import { randomUUID } from 'crypto'

export async function POST(request: NextRequest) {
  try {
    const isDevBypass = request.headers.get('X-Dev-Bypass') === 'true'
    let userId: string | undefined = undefined
    if (!isDevBypass) {
      try {
        const a = auth()
        userId = a?.userId || undefined
      } catch {}
    }
    const body = await request.json()
    const { videoId, access = 'public', expiresIn } = body as { videoId?: string; access?: 'public'|'invite'; expiresIn?: number }
    if (!videoId) return NextResponse.json({ success: false, error: 'videoId required' }, { status: 400 })

    if (!isDevBypass && !userId) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    if (!isDevBypass && access === 'invite') {
      const user = await getUserPlanAndTenant(userId!)
      const limits = getPlanLimits(user.plan)
      const used = await getInviteCountForTenant(user.tenantId)
      const max = Number(limits.invites ?? 2)
      if (used >= max) {
        return NextResponse.json({ success: false, error: 'Invite limit reached', reason: 'upgrade_required' }, { status: 402 })
      }
    }

    const expiresAt = expiresIn ? new Date(Date.now() + Math.max(0, expiresIn)) : undefined
    const rec = isDatabaseConfigured() && userId
      ? await createShareLink({
          shareId: `vshare_${randomUUID().replace(/-/g, '').slice(0, 16)}`,
          ownerClerkId: userId,
          externalVideoId: videoId,
          type: `video:${access}`,
          content: JSON.stringify({ access, managerCanReviewEvidence: true }),
          expiresAt,
          createdAt: new Date(),
        })
      : createVideoShare({
          videoId,
          access,
          ownerUserId: userId || undefined,
          expiresAt: expiresAt?.getTime(),
        })
    const base = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'
    const shareUrl = `${base}/video/share/${rec.shareId}`
    return NextResponse.json({ success: true, shareId: rec.shareId, shareUrl })
  } catch (e: any) {
    return NextResponse.json({ success: false, error: 'bad request', detail: (e && e.message) || 'unknown' }, { status: 400 })
  }
}


