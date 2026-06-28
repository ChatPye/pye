import { logger } from '@/lib/logger';

function resolveAppOrigin(): string {
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  return (
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.APP_URL ||
    'http://localhost:3000'
  );
}

/**
 * Queue background processing (fire-and-forget HTTP to worker route).
 * Like media-search-engine Kafka publish — upload returns immediately, worker runs async.
 */
export async function triggerBackgroundProcessing(
  videoId: string,
  source: 'youtube' | 'upload',
  ownerId?: string | null
): Promise<void> {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    logger.warn('CRON_SECRET unset — rely on Vercel cron for video processing', { videoId });
    return;
  }

  const url = `${resolveAppOrigin()}/api/video/process/worker`;

  // Fire-and-forget — do NOT await (worker may run up to 300s)
  fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${secret}`,
    },
    body: JSON.stringify({ videoId, source, ownerId: ownerId ?? null }),
    cache: 'no-store',
  }).catch((error) => {
    logger.warn('Background worker trigger failed', {
      videoId,
      error: error instanceof Error ? error.message : String(error),
    });
  });
}

export function verifyWorkerAuth(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const auth = request.headers.get('authorization');
  return auth === `Bearer ${secret}`;
}
