import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { apiErrorResponse, ApiError } from '@/lib/api/errors';
import { findResourceById } from '@/lib/db/resource-repository';
import { isUserVisibleReadyState } from '@/lib/resources/state-machine';

export const dynamic = 'force-dynamic';

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const authUser = await requireAuth();
    const { id } = await context.params;
    const resource = await findResourceById(id);

    if (!resource) {
      throw new ApiError('NOT_FOUND', 'Resource not found.', 404);
    }

    if (resource.ownerUserId !== authUser.id) {
      throw new ApiError('FORBIDDEN', 'You do not have access to this resource.', 403);
    }

    return NextResponse.json({
      resource: {
        id: resource.id,
        sourceType: resource.sourceType,
        sourceRef: resource.sourceRef,
        title: resource.title,
        processingState: resource.processingState,
        visibility: resource.visibility,
        legacyExternalId: resource.legacyExternalId ?? null,
        ready: isUserVisibleReadyState(resource.processingState),
        failureCode: resource.failureCode,
        failureMessage: resource.failureMessage,
        artefact: isUserVisibleReadyState(resource.processingState) ? resource.artefact : null,
        createdAt: resource.createdAt.toISOString(),
        updatedAt: resource.updatedAt.toISOString(),
      },
    });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
