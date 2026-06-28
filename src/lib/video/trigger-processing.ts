import { logger } from '@/lib/logger';

function resolveAppOrigin(): string {
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  }
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, '');
  }
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  return process.env.APP_URL || 'http://localhost:3000';
}

export async function triggerBackgroundProcessing(
  videoId: string,
  source: 'youtube' | 'upload',
  ownerId?: string | null
): Promise<void> {
  const secret = process.env.CRON_SECRET;
  if (!secret) return;

  const url = `${resolveAppOrigin()}/api/video/process/worker`;

  fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${secret}`,
    },
    body: JSON.stringify({ videoId, source, ownerId: ownerId ?? null }),
    cache: 'no-store',
  }).catch((error) => {
    logger.warn('Background worker HTTP trigger failed', {
      videoId,
      error: error instanceof Error ? error.message : String(error),
    });
  });
}

/** Vercel cron sends x-vercel-cron: 1; optional CRON_SECRET bearer for manual calls. */
export function verifyWorkerAuth(request: Request): boolean {
  if (request.headers.get('x-vercel-cron') === '1') {
    return true;
  }

  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return process.env.NODE_ENV === 'development';
  }

  const auth = request.headers.get('authorization');
  return auth === `Bearer ${secret}`;
}
