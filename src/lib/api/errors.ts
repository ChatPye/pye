import { NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { logger } from '@/lib/logger';
import type { RequestContext } from '@/lib/observability/request-context';

export type ApiErrorCode =
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'VALIDATION_ERROR'
  | 'RATE_LIMITED'
  | 'CONFLICT'
  | 'PROCESSING_FAILED'
  | 'PROVIDER_ERROR'
  | 'INTERNAL_ERROR';

export class ApiError extends Error {
  readonly code: ApiErrorCode;
  readonly status: number;
  readonly expose: boolean;
  readonly details?: Record<string, unknown>;

  constructor(
    code: ApiErrorCode,
    message: string,
    status: number,
    options?: { expose?: boolean; details?: Record<string, unknown> },
  ) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.status = status;
    this.expose = options?.expose ?? true;
    this.details = options?.details;
  }
}

export function apiErrorResponse(
  error: unknown,
  context?: RequestContext,
): NextResponse {
  const referenceId = context?.requestId ?? randomUUID();

  if (error instanceof ApiError) {
    if (!error.expose) {
      logger.error('API error', error, { requestId: referenceId, code: error.code });
    }
    return NextResponse.json(
      {
        error: error.expose ? error.message : 'Something went wrong.',
        code: error.code,
        referenceId,
        ...(error.details ? { details: error.details } : {}),
      },
      { status: error.status, headers: { 'x-request-id': referenceId } },
    );
  }

  logger.error('Unhandled API error', error instanceof Error ? error : undefined, {
    requestId: referenceId,
  });

  return NextResponse.json(
    {
      error: 'Something went wrong.',
      code: 'INTERNAL_ERROR' satisfies ApiErrorCode,
      referenceId,
    },
    { status: 500, headers: { 'x-request-id': referenceId } },
  );
}

export function assertProductionSafety(): void {
  if (process.env.NODE_ENV === 'production' && process.env.DEV_AUTH_BYPASS === 'true') {
    throw new ApiError(
      'INTERNAL_ERROR',
      'DEV_AUTH_BYPASS cannot be enabled in production.',
      500,
      { expose: false },
    );
  }
}
