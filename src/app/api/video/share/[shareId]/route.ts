import { NextRequest, NextResponse } from 'next/server'
import { getVideoShare } from '@/server/memory/videoShares'
import { auth } from '@clerk/nextjs/server'
import { findShareLink } from '@/lib/db/share-repository'

export async function GET(_req: NextRequest, context: { params: Promise<{ shareId: string }> }) {
  const { shareId } = await context.params
  const stored = await findShareLink(shareId)
  const rec = stored ? {
    videoId: stored.externalVideoId,
    access: stored.type === 'video:invite' ? 'invite' as const : 'public' as const,
    expiresAt: stored.expiresAt?.getTime(),
  } : getVideoShare(shareId)
  if (!rec) return NextResponse.json({ success: false, error: 'Not found or expired' }, { status: 404 })
  if (rec.access === 'invite') {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ success: false, error: 'Auth required' }, { status: 401 })
  }
  return NextResponse.json({ success: true, videoId: rec.videoId, access: rec.access })
}


