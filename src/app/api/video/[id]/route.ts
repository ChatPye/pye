import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import {
  findVideoByExternalId,
  incrementVideoAccess,
  useAuroraForVideos,
} from '@/lib/db/video-repository'
import { getMemoryVideo } from '@/data/stores/videoMemoryStore'
import type { VideoProcessDocument } from '@/data/models/VideoProcess'
import { sanitizeVideoForClient } from '@/lib/video/client-video'

type StatusResponse = {
  success: boolean
  video?: Partial<VideoProcessDocument> | null
  error?: string
  testMode?: boolean
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    if (!id) {
      return NextResponse.json<StatusResponse>(
        { success: false, error: 'Video ID is required' },
        { status: 400 }
      )
    }

    const useMemory =
      process.env.DEV_FORCE_IN_MEMORY === 'true' &&
      !useAuroraForVideos()

    if (useMemory) {
      const memoryVideo = getMemoryVideo(id)
      if (memoryVideo) {
        return NextResponse.json<StatusResponse>({
          success: true,
          video: memoryVideo,
          testMode: true,
        })
      }
      return NextResponse.json<StatusResponse>(
        { success: false, error: 'Video not found (memory)' },
        { status: 404 }
      )
    }

    await requireAuth()

    const video = await findVideoByExternalId(id)
    if (video) {
      await incrementVideoAccess(id)
      return NextResponse.json<StatusResponse>({ success: true, video: sanitizeVideoForClient(video) })
    }

    const memoryVideo = getMemoryVideo(id)
    if (memoryVideo) {
      return NextResponse.json<StatusResponse>({ success: true, video: memoryVideo })
    }

    return NextResponse.json<StatusResponse>(
      { success: false, error: 'Video not found' },
      { status: 404 }
    )
  } catch (error) {
    console.error('Video [id] GET error:', error)
    return NextResponse.json<StatusResponse>(
      { success: false, error: 'Authentication required' },
      { status: 401 }
    )
  }
}
