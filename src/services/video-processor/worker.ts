import { fetchYouTubeTranscript } from '@/lib/video/transcript'
import { downloadYouTubeAudio } from '@/lib/video/extract-audio'
import { audioTranscriptionService } from '@/lib/audio-transcription'
import { upsertMemoryVideo } from '@/data/stores/videoMemoryStore'
import { generateEmbeddings } from '@/lib/bedrock-embeddings'
import { generateSummary } from '@/lib/bedrock-summary'
import { generateChaptersFromTranscript } from '@/lib/chapter-generation'
import { logger } from '@/lib/logger'
import { fetchYouTubeMetadata } from '@/lib/video/metadata'
import { recordMetric } from '@/lib/metrics'
import {
  findVideoByExternalId,
  updateVideoStatus,
  updateVideoTranscript,
  updateVideoProcessingResult,
  useAuroraForVideos,
} from '@/lib/db/video-repository'
import { recordLearningEvent } from '@/lib/db/learning-events'
import type { ProcessingStatus } from '@/data/models/VideoProcess'
import type { VideoRecord } from '@/lib/db/video-types'

interface ProcessingJobPayload {
  videoId: string
  ownerId: string | null
  source: 'youtube' | 'upload'
}

export async function triggerVideoProcessing(payload: ProcessingJobPayload): Promise<void> {
  const { videoId, source } = payload

  let record = await findVideoByExternalId(videoId)

  if (!record) {
    console.warn('[VideoProcessor] No video record found for job', videoId)
    await recordMetric({
      eventType: 'video.processing.skipped',
      userId: payload.ownerId || undefined,
      videoId,
      properties: { source, reason: 'missing-record' },
    })
    return
  }

  const recordFailureMetric = async (stage: string, reason: string, extra?: Record<string, unknown>) => {
    await recordMetric({
      eventType: 'video.processing.failed',
      userId: payload.ownerId || undefined,
      videoId,
      properties: { source, stage, reason, ...extra },
    })
  }

  await recordMetric({
    eventType: 'video.processing.started',
    userId: payload.ownerId || undefined,
    videoId,
    properties: { source },
  })

  if (payload.ownerId) {
    await recordLearningEvent({
      ownerClerkId: payload.ownerId,
      type: 'video.processing_started',
      externalVideoId: videoId,
      payload: { source },
    })
  }

  const metadataUpdates: Partial<VideoRecord> = {}

  if (source === 'youtube') {
    try {
      const meta = await fetchYouTubeMetadata(videoId)
      if (meta.title) metadataUpdates.title = meta.title
      if (meta.author) metadataUpdates.channel = meta.author
      if (meta.description) metadataUpdates.description = meta.description
      if (meta.thumbnail) metadataUpdates.thumbnail = meta.thumbnail
      if (meta.publishedAt) metadataUpdates.published = meta.publishedAt
      if (meta.durationSeconds !== undefined) metadataUpdates.duration = meta.durationSeconds
    } catch (error) {
      logger.warn('Failed to fetch YouTube metadata', {
        videoId,
        error: (error as Error)?.message,
      })
    }
  }

  const persistTranscript = async (
    segments: Array<{ text: string; start: number; duration: number }>
  ) => {
    const updated = await updateVideoTranscript(videoId, segments)
    record = updated ?? { ...record!, transcript: segments }
    if (!useAuroraForVideos()) {
      upsertMemoryVideo({ ...(record || {}), videoId, transcript: segments })
    }
  }

  if (source === 'youtube') {
    const ytTranscript = await fetchYouTubeTranscript(videoId)
    if (ytTranscript && ytTranscript.length > 0) {
      await updateVideoStatus(videoId, 'transcribing')
      await persistTranscript(ytTranscript)
    } else {
      await updateVideoStatus(videoId, 'extracting')
      await downloadYouTubeAudio(videoId)
      const result = await audioTranscriptionService.transcribeVideoAudio(videoId)

      let segments: Array<{ text: string; start: number; duration: number }> = []

      if (Array.isArray(result.transcript)) {
        segments = result.transcript
      } else if (typeof result.transcript === 'string') {
        segments = result.transcript
          .split('.')
          .map((sentence: string, index: number) => ({
            text: sentence.trim(),
            start: index * 5,
            duration: 5,
          }))
          .filter((segment) => segment.text.length > 0)
      }

      if (segments.length === 0) {
        logger.error(
          'No transcript segments generated from YouTube audio',
          new Error('Transcript parsing failed'),
          { videoId }
        )
        await updateVideoStatus(videoId, 'failed', 'Failed to generate transcript from audio')
        await recordFailureMetric('transcribe', 'youtube-audio-empty')
        if (payload.ownerId) {
          await recordLearningEvent({
            ownerClerkId: payload.ownerId,
            type: 'video.processing_failed',
            externalVideoId: videoId,
            payload: { stage: 'transcribe' },
          })
        }
        return
      }

      await persistTranscript(segments)
    }
  } else {
    await updateVideoStatus(videoId, 'extracting')
    logger.info('Processing custom uploaded video', {
      videoId,
      hasS3Key: !!record?.s3Key,
    })

    const s3Key = record?.s3Key || null
    const videoUrl = record?.videoUrl || null

    let result
    try {
      if (s3Key) {
        result = await audioTranscriptionService.transcribeVideoAudio(videoId, s3Key)
      } else if (videoUrl) {
        result = await audioTranscriptionService.transcribeVideoAudio(videoId, videoUrl)
      } else {
        throw new Error('No S3 key or video URL found for uploaded video')
      }
    } catch (error) {
      logger.error(
        'Custom video transcription failed',
        error instanceof Error ? error : new Error(String(error)),
        { videoId, hasS3Key: !!s3Key, hasVideoUrl: !!videoUrl }
      )
      await updateVideoStatus(videoId, 'failed', 'Failed to transcribe uploaded video')
      await recordFailureMetric('transcribe', 'upload-transcription-error', { hasS3Key: !!s3Key })
      if (payload.ownerId) {
        await recordLearningEvent({
          ownerClerkId: payload.ownerId,
          type: 'video.processing_failed',
          externalVideoId: videoId,
          payload: { stage: 'transcribe' },
        })
      }
      return
    }

    let segments: Array<{ text: string; start: number; duration: number }> = []

    if (Array.isArray(result.transcript)) {
      segments = result.transcript
    } else if (typeof result.transcript === 'string') {
      segments = result.transcript
        .split('.')
        .map((sentence, index) => ({
          text: sentence.trim(),
          start: index * 5,
          duration: 5,
        }))
        .filter((segment) => segment.text.length > 0)
    }

    if (segments.length === 0) {
      logger.error(
        'No transcript segments generated',
        new Error('Transcript segment generation failed'),
        { videoId }
      )
      await updateVideoStatus(videoId, 'failed', 'Failed to generate transcript segments')
      await recordFailureMetric('transcribe', 'segments-empty')
      return
    }

    await updateVideoStatus(videoId, 'transcribing')
    await persistTranscript(segments)
    logger.info('Custom video transcript persisted', { videoId, segmentCount: segments.length })

    const last = segments[segments.length - 1]
    if (last) {
      metadataUpdates.duration = Math.ceil(last.start + (last.duration || 0))
    }
  }

  await updateVideoStatus(videoId, 'embedding')

  const transcriptSegments = record?.transcript ?? []

  if (!transcriptSegments || transcriptSegments.length === 0) {
    logger.error(
      'No transcript segments available',
      new Error('Transcript generation failed'),
      { videoId }
    )
    await updateVideoStatus(videoId, 'failed', 'No transcript generated')
    await recordFailureMetric('transcribe', 'no-segments-after-persist')
    return
  }

  logger.info('Generating embeddings', { videoId, segmentCount: transcriptSegments.length })

  let embeddings
  try {
    embeddings = await generateEmbeddings(transcriptSegments || [])
  } catch (error) {
    logger.error(
      'Embedding generation threw error',
      error instanceof Error ? error : new Error(String(error)),
      { videoId }
    )
    await updateVideoStatus(videoId, 'failed', 'Embedding generation failed')
    await recordFailureMetric('embed', 'exception', { message: (error as Error)?.message })
    return
  }

  if (!embeddings || embeddings.length === 0) {
    logger.error('No embeddings generated', new Error('Embedding generation failed'), { videoId })
    await updateVideoStatus(videoId, 'failed', 'Failed to generate embeddings')
    await recordFailureMetric('embed', 'empty-embeddings')
    return
  }

  let summaryResult
  try {
    summaryResult = await generateSummary(transcriptSegments || [])
  } catch (error) {
    logger.error(
      'Summary generation threw error',
      error instanceof Error ? error : new Error(String(error)),
      { videoId }
    )
    await recordFailureMetric('summary', 'exception', { message: (error as Error)?.message })
    summaryResult = {
      title: 'Video session',
      summary: 'Summary unavailable due to processing error.',
      keyPoints: [],
    }
  }

  const { summary, keyPoints, title } = summaryResult

  if (source === 'upload') {
    if (title) {
      metadataUpdates.title = title
    } else if (!metadataUpdates.title && record?.title) {
      metadataUpdates.title = record.title
    }
    metadataUpdates.description = summary
    metadataUpdates.channel = record?.channel || 'Uploaded Video'
  }

  logger.info('Generating chapters', { videoId })
  let chapters: Array<{ start: number; title: string; summary?: string }> = []
  try {
    const durationForChapters = metadataUpdates.duration ?? record?.duration
    chapters = await generateChaptersFromTranscript(transcriptSegments, durationForChapters)
    logger.info('Chapters generated', { videoId, chapterCount: chapters.length })
  } catch (error) {
    logger.error(
      'Chapter generation failed',
      error instanceof Error ? error : new Error(String(error)),
      { videoId }
    )
    await recordMetric({
      eventType: 'video.processing.warning',
      userId: payload.ownerId || undefined,
      videoId,
      properties: { source, stage: 'chapters', warning: (error as Error)?.message },
    })
  }

  await updateVideoProcessingResult(videoId, {
    embeddings,
    summary,
    keyPoints,
    transcript: transcriptSegments,
    chapters,
    ...metadataUpdates,
    processingStatus: 'complete' as ProcessingStatus,
    processedAt: new Date(),
  })

  await updateVideoStatus(videoId, 'complete')

  upsertMemoryVideo({
    ...(record || {}),
    videoId,
    embeddings,
    summary,
    keyPoints,
    transcript: transcriptSegments,
    chapters,
    ...metadataUpdates,
    processingStatus: 'complete',
    processedAt: new Date(),
  })

  logger.info('Video processing completed successfully', {
    videoId,
    transcriptSegments: transcriptSegments.length,
    embeddings: embeddings.length,
    chapters: chapters.length,
    hasSummary: !!summary,
    keyPointsCount: keyPoints.length,
    title: metadataUpdates.title || record?.title,
  })

  if (payload.ownerId) {
    await recordLearningEvent({
      ownerClerkId: payload.ownerId,
      type: 'video.processing_complete',
      externalVideoId: videoId,
      payload: {
        source,
        segmentCount: transcriptSegments.length,
        chapterCount: chapters.length,
      },
    })
  }

  await recordMetric({
    eventType: 'video.processing.completed',
    userId: payload.ownerId || undefined,
    videoId,
    properties: {
      source,
      transcriptSegments: transcriptSegments.length,
      embeddings: embeddings.length,
      chapters: chapters.length,
      hasSummary: Boolean(summary),
    },
  })
}
