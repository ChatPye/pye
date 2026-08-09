import { randomUUID } from 'crypto';
import { logger } from '@/lib/logger';

export type RequestContext = {
  requestId: string;
  userId?: string;
  organisationId?: string;
  path?: string;
};

const REQUEST_ID_HEADER = 'x-request-id';

export function createRequestContext(init?: Partial<RequestContext>): RequestContext {
  return {
    requestId: init?.requestId ?? randomUUID(),
    userId: init?.userId,
    organisationId: init?.organisationId,
    path: init?.path,
  };
}

export function requestIdFromHeaders(headers: Headers): string {
  return headers.get(REQUEST_ID_HEADER) ?? randomUUID();
}

export function logWithContext(
  level: 'info' | 'warn' | 'error',
  message: string,
  context: RequestContext,
  extra?: Record<string, string | number | boolean | null | undefined>,
  error?: Error,
): void {
  const payload = {
    requestId: context.requestId,
    userId: context.userId,
    organisationId: context.organisationId,
    path: context.path,
    ...extra,
  };

  if (level === 'error') {
    logger.error(message, error, payload);
    return;
  }
  if (level === 'warn') {
    logger.warn(message, payload);
    return;
  }
  logger.info(message, payload);
}

export { REQUEST_ID_HEADER };
