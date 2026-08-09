import { logger } from '@/lib/logger';
import type { ResourceProcessingMessage } from '@/lib/queue/resource-processing-types';

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

export async function triggerResourceWorker(message: ResourceProcessingMessage): Promise<void> {
  const secret = process.env.CRON_SECRET;
  if (!secret) return;

  const url = `${resolveAppOrigin()}/api/resources/process/worker`;

  fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${secret}`,
    },
    body: JSON.stringify(message),
    cache: 'no-store',
  }).catch((error) => {
    logger.warn('Resource worker HTTP trigger failed', {
      resourceId: message.resourceId,
      error: error instanceof Error ? error.message : String(error),
    });
  });
}

export { verifyWorkerAuth } from '@/lib/video/trigger-processing';
