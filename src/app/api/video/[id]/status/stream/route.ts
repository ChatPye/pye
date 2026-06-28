import { NextRequest } from 'next/server'
import { logger } from '@/lib/logger'
import { findVideoByExternalId } from '@/lib/db/video-repository'
import { getMemoryVideo } from '@/data/stores/videoMemoryStore'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * Server-Sent Events endpoint for real-time video processing status updates
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: videoId } = await params
  
  if (!videoId) {
    return new Response('Video ID required', { status: 400 })
  }

  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder()
      
      const sendEvent = (event: string, data: any) => {
        const message = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`
        controller.enqueue(encoder.encode(message))
      }

      let lastStatus: string | null = null
      let intervalId: NodeJS.Timeout | null = null
      
      const checkStatus = async () => {
        try {
          let videoData = await findVideoByExternalId(videoId)
          if (!videoData) {
            videoData = getMemoryVideo(videoId) as typeof videoData
          }

          if (!videoData) {
            sendEvent('error', { message: 'Video not found' })
            controller.close()
            return
          }

          const currentStatus = videoData.processingStatus || 'queued'
          
          // Only send update if status changed
          if (currentStatus !== lastStatus) {
            lastStatus = currentStatus
            
            sendEvent('status', {
              status: currentStatus,
              videoId,
              progress: getStatusProgress(currentStatus),
              message: getStatusMessage(currentStatus),
              timestamp: new Date().toISOString()
            })

            // Send completion event
            if (currentStatus === 'complete' || currentStatus === 'failed') {
              sendEvent(currentStatus === 'complete' ? 'complete' : 'error', {
                status: currentStatus,
                videoId,
                message: currentStatus === 'complete' 
                  ? 'Video processing completed successfully!'
                  : `Processing failed: ${videoData.errorMessage || 'Unknown error'}`,
                timestamp: new Date().toISOString()
              })
              
              // Close stream after completion
              if (intervalId) clearInterval(intervalId)
              setTimeout(() => controller.close(), 1000)
            }
          }
        } catch (error) {
          logger.error('SSE status check error', error instanceof Error ? error : new Error(String(error)), { videoId })
          sendEvent('error', { message: 'Failed to check status' })
        }
      }

      // Send initial status
      await checkStatus()

      // Poll every 2 seconds while processing
      intervalId = setInterval(checkStatus, 2000)

      // Handle client disconnect
      request.signal.addEventListener('abort', () => {
        if (intervalId) clearInterval(intervalId)
        controller.close()
      })
    }
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no', // Disable nginx buffering
    },
  })
}

function getStatusProgress(status: string): number {
  const progressMap: Record<string, number> = {
    queued: 10,
    pending: 15,
    extracting: 25,
    transcribing: 50,
    embedding: 75,
    complete: 100,
    failed: 0
  }
  return progressMap[status] || 0
}

function getStatusMessage(status: string): string {
  const messages: Record<string, string> = {
    queued: 'Video queued for processing...',
    pending: 'Preparing to process video...',
    extracting: 'Extracting audio from video...',
    transcribing: 'Generating transcript...',
    embedding: 'Creating embeddings and analyzing content...',
    complete: 'Processing complete!',
    failed: 'Processing failed'
  }
  return messages[status] || 'Processing...'
}

