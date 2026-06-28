import { NextRequest } from 'next/server';
import { logger } from '@/lib/logger';
import { findVideoByExternalId } from '@/lib/db/video-repository';
import { getMemoryVideo } from '@/data/stores/videoMemoryStore';
import {
  getProcessingStatusLabel,
  processingProgressFor,
} from '@/lib/processing-labels';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * Server-Sent Events endpoint for real-time video processing status updates
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: videoId } = await params;

  if (!videoId) {
    return new Response('Video ID required', { status: 400 });
  }

  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();

      const sendEvent = (event: string, data: Record<string, unknown>) => {
        const message = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
        controller.enqueue(encoder.encode(message));
      };

      let lastStatus: string | null = null;
      let lastProgress = -1;
      let intervalId: NodeJS.Timeout | null = null;

      const checkStatus = async () => {
        try {
          let videoData = await findVideoByExternalId(videoId);
          if (!videoData) {
            videoData = getMemoryVideo(videoId) as typeof videoData;
          }

          if (!videoData) {
            sendEvent('error', { message: 'Video not found' });
            controller.close();
            return;
          }

          const currentStatus = videoData.processingStatus || 'queued';
          const progress = processingProgressFor(currentStatus);

          if (currentStatus !== lastStatus || progress !== lastProgress) {
            lastStatus = currentStatus;
            lastProgress = progress;

            sendEvent('status', {
              status: currentStatus,
              videoId,
              progress,
              message: getProcessingStatusLabel(currentStatus, progress),
              timestamp: new Date().toISOString(),
            });

            if (currentStatus === 'complete' || currentStatus === 'failed') {
              sendEvent(currentStatus === 'complete' ? 'complete' : 'error', {
                status: currentStatus,
                videoId,
                progress: currentStatus === 'complete' ? 100 : 0,
                message:
                  currentStatus === 'complete'
                    ? 'Your workspace is ready — we notified you!'
                    : `Processing failed: ${videoData.errorMessage || 'Unknown error'}`,
                timestamp: new Date().toISOString(),
              });

              if (intervalId) clearInterval(intervalId);
              setTimeout(() => controller.close(), 1000);
            }
          }
        } catch (error) {
          logger.error(
            'SSE status check error',
            error instanceof Error ? error : new Error(String(error)),
            { videoId }
          );
          sendEvent('error', { message: 'Failed to check status' });
        }
      };

      await checkStatus();
      intervalId = setInterval(checkStatus, 2000);

      request.signal.addEventListener('abort', () => {
        if (intervalId) clearInterval(intervalId);
        controller.close();
      });
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
