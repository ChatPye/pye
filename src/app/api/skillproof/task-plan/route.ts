import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { findVideoByExternalId } from '@/lib/db/video-repository'
import { generateSkillProofTaskPlan } from '@/lib/skillproof/task-plan'

export const maxDuration = 60

/** Generates tasks from the actual tutorial, never from a fixed course template. */
export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth()
    const videoId = request.nextUrl.searchParams.get('videoId')?.trim()
    if (!videoId) return NextResponse.json({ success: false, error: 'videoId is required' }, { status: 400 })

    const video = await findVideoByExternalId(videoId)
    if (!video) return NextResponse.json({ success: false, error: 'Video not found' }, { status: 404 })
    if (video.ownerId && video.ownerId !== user.id) return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
    if (!video.transcript?.length) {
      return NextResponse.json({ success: false, processing: true, error: 'Task plan will be ready when video processing completes' }, { status: 202 })
    }

    const plan = await generateSkillProofTaskPlan(video)
    return NextResponse.json({ success: true, plan })
  } catch (error) {
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : 'Unable to generate task plan' }, { status: 500 })
  }
}
