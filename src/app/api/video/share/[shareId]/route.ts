import { NextRequest, NextResponse } from 'next/server'
import { getVideoShare } from '@/server/memory/videoShares'
import { auth } from '@clerk/nextjs/server'

export async function GET(_req: NextRequest, context: { params: Promise<{ shareId: string }> }) {
  const { shareId } = await context.params
  const rec = getVideoShare(shareId)
  if (!rec) return NextResponse.json({ success: false, error: 'Not found or expired' }, { status: 404 })
  if (rec.access === 'invite') {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ success: false, error: 'Auth required' }, { status: 401 })
  }
  return NextResponse.json({ success: true, videoId: rec.videoId, access: rec.access })
}


