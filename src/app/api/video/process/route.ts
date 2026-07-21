import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { enqueueVideoProcessingJob } from '@/services/video-processor/queue'
import { getPlanLimits, getUserPlanAndTenant } from '@/lib/plans'
import {
  countVideosByOwnerSince,
  findVideoByExternalId,
  incrementVideoAccess,
  persistVideoRecord,
} from '@/lib/db/video-repository'
import type { ProcessingStatus, VideoProcessDocument } from '@/data/models/VideoProcess'
import { isUploadVideoId } from '@/lib/video-upload-utils'
import { sanitizeVideoForClient } from '@/lib/video/client-video'
import { scheduleVideoProcessing } from '@/lib/video/schedule-processing'
import { processingProgressFor } from '@/services/video-processor/staged-worker'
import { recordLearningEvent } from '@/lib/db/learning-events'

type SourceType = 'youtube' | 'upload'

type StatusResponse = {
  success: boolean
  video?: Partial<VideoProcessDocument> | null
  cached?: boolean
  processing?: boolean
  queued?: boolean
  testMode?: boolean
  progress?: number
  error?: string
  details?: string
}

function appendStatusHistory(record: Partial<VideoProcessDocument>, status: ProcessingStatus) {
  if (!record.statusHistory) {
    record.statusHistory = []
  }
  record.statusHistory.push({ status, updatedAt: new Date() })
  record.processingStatus = status
}

// appendStatusHistory reserved for explicit status transitions (retry, etc.)

export async function POST(request: NextRequest) {
  try {
    const headers = request.headers
    const isDevBypass = headers.get('X-Dev-Bypass') === 'true'
    const authUser = isDevBypass ? { id: 'dev-user' } : await requireAuth()
    const body = await request.json()
    const { videoId, testMode, source = 'youtube', retry } = body as {
      videoId?: string
      testMode?: boolean
      source?: SourceType
      retry?: boolean
    }

    if (!videoId) {
      return NextResponse.json<StatusResponse>(
        { success: false, error: 'Video ID is required' },
        { status: 400 }
      )
    }

    if (source === 'upload' && !isUploadVideoId(videoId)) {
      return NextResponse.json<StatusResponse>(
        {
          success: false,
          error: 'Invalid upload. Attach your video file — filenames cannot be used as video IDs.',
        },
        { status: 400 }
      )
    }

    if (testMode || isDevBypass) {
      if (process.env.NODE_ENV !== 'development') {
        return NextResponse.json<StatusResponse>(
          { success: false, error: 'Test mode is disabled in production' },
          { status: 403 }
        )
      }
      const mockVideo: Partial<VideoProcessDocument> = {
        videoId,
        ownerId: authUser.id,
        source,
        title: `Test Video ${videoId}`,
        channel: 'Test Channel',
        description: 'This is a test video for development',
        duration: 120,
        thumbnail: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
        published: new Date().toISOString(),
        transcript: [
          { text: 'Welcome to this test video', start: 0, duration: 3 },
          { text: 'This is a sample transcript for testing', start: 3, duration: 4 },
          { text: 'The extension should be able to fetch this', start: 7, duration: 5 },
          { text: 'And display it in the sidebar', start: 12, duration: 4 },
          { text: 'Thank you for testing', start: 16, duration: 3 },
        ],
        embeddings: [],
        summary:
          'This is a test video with sample transcript data for development and testing purposes.',
        keyPoints: [
          'Test video for development',
          'Sample transcript data',
          'Extension testing',
          'Mock data response',
        ],
        processingStatus: 'complete',
        processedAt: new Date(),
        accessCount: 1,
        lastAccessed: new Date(),
        statusHistory: [{ status: 'complete', updatedAt: new Date() }],
      }

      return NextResponse.json<StatusResponse>({
        success: true,
        video: mockVideo,
        cached: false,
        testMode: true,
      })
    }

    let existingVideo = await findVideoByExternalId(videoId)

    if (existingVideo && retry && existingVideo.processingStatus === 'failed') {
      const hasTranscript = (existingVideo.transcript?.length ?? 0) > 0;
      const resumeStatus: ProcessingStatus = hasTranscript
        ? 'embedding'
        : existingVideo.transcriptRef
          ? 'transcribing'
          : 'queued';

      existingVideo = await persistVideoRecord({
        ...existingVideo,
        videoId,
        processingStatus: resumeStatus,
        errorMessage: undefined,
      });
      scheduleVideoProcessing({
        videoId,
        ownerId: authUser.id,
        source: (existingVideo.source as SourceType) || source,
      });
    }

    if (existingVideo) {
      if (existingVideo.processingStatus === 'complete') {
        existingVideo = (await incrementVideoAccess(videoId)) ?? existingVideo
        return NextResponse.json<StatusResponse>({
          success: true,
          video: sanitizeVideoForClient(existingVideo),
          cached: true,
        })
      }

      const stuckStatuses: ProcessingStatus[] = ['queued', 'pending', 'failed']
      if (
        stuckStatuses.includes(existingVideo.processingStatus as ProcessingStatus)
      ) {
        await enqueueVideoProcessingJob({
          videoId,
          ownerId: authUser.id,
          source: (existingVideo.source as SourceType) || source,
        })
      } else {
        scheduleVideoProcessing({
          videoId,
          ownerId: authUser.id,
          source: (existingVideo.source as SourceType) || source,
        })
      }

      return NextResponse.json<StatusResponse>({
        success: true,
        video: sanitizeVideoForClient(existingVideo),
        cached: true,
        processing: true,
        progress: processingProgressFor(existingVideo.processingStatus as ProcessingStatus),
      })
    }

    if (!isDevBypass) {
      const planInfo = await getUserPlanAndTenant(authUser.id)
      const planLimits = getPlanLimits(planInfo.plan)
      const rawLimit = planLimits?.videosPerMonth
      const numericLimit = typeof rawLimit === 'string' ? Number(rawLimit) : rawLimit
      if (
        numericLimit !== undefined &&
        !Number.isNaN(Number(numericLimit)) &&
        Number(numericLimit) >= 0
      ) {
        const maxVideos = Number(numericLimit)
        const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
        const processedCount = await countVideosByOwnerSince(authUser.id, since)

        if (processedCount >= maxVideos) {
          return NextResponse.json<StatusResponse>(
            {
              success: false,
              error: 'Plan limit reached',
              details: `You have reached your ${maxVideos} video limit for this month. Upgrade to continue.`,
            },
            { status: 402 }
          )
        }
      }
    }

    const newVideoRecord = await persistVideoRecord({
      videoId,
      ownerId: authUser.id,
      source,
      title: source === 'upload' ? `Uploaded video` : `Video ${videoId}`,
      channel: source === 'upload' ? 'Uploaded Video' : 'Unknown Channel',
      description: '',
      duration: 0,
      thumbnail:
        source === 'upload' || isUploadVideoId(videoId)
          ? ''
          : `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
      published: new Date().toISOString(),
      processingStatus: 'queued',
      accessCount: 1,
      lastAccessed: new Date(),
      statusHistory: [{ status: 'queued', updatedAt: new Date() }],
      transcript: [],
      embeddings: [],
      chapters: [],
      summary: '',
      keyPoints: [],
    })

    await enqueueVideoProcessingJob({ videoId, ownerId: authUser.id, source })

    return NextResponse.json<StatusResponse>({
      success: true,
      video: sanitizeVideoForClient(newVideoRecord),
      queued: true,
    })
  } catch (error) {
    console.error('Video process API error:', error)
    return NextResponse.json<StatusResponse>(
      { success: false, error: 'Authentication required' },
      { status: 401 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const videoId = searchParams.get('videoId')

    if (!videoId) {
      return NextResponse.json<StatusResponse>(
        { success: false, error: 'Video ID is required' },
        { status: 400 }
      )
    }

    const authUser = await requireAuth()
    const video = await findVideoByExternalId(videoId)

    if (!video) {
      return NextResponse.json<StatusResponse>(
        { success: false, error: 'Video not found' },
        { status: 404 }
      )
    }

    const updated = await incrementVideoAccess(videoId)

    await recordLearningEvent({
      ownerClerkId: authUser.id,
      type: 'video.viewed',
      externalVideoId: videoId,
    })

    if (video.ownerId && video.ownerId !== authUser.id) {
      console.warn('[VideoProcess] User accessing video they do not own', {
        authUser: authUser.id,
        owner: video.ownerId,
      })
    }

    return NextResponse.json<StatusResponse>({ success: true, video: sanitizeVideoForClient(updated ?? video) })
  } catch (error) {
    console.error('Video get API error:', error)
    return NextResponse.json<StatusResponse>(
      { success: false, error: 'Authentication required' },
      { status: 401 }
    )
  }
}
