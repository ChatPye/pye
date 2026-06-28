import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { findVideoByExternalId } from '@/lib/db/video-repository';
import { processingProgressFor } from '@/services/video-processor/staged-worker';
import type { ProcessingStatus } from '@/data/models/VideoProcess';

/** Simple job status (media-search-engine: 0=failed, 1=pending, 2=complete). */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAuth();
    const { id } = await params;
    const record = await findVideoByExternalId(id);

    if (!record) {
      return NextResponse.json({ success: false, error: 'Video not found' }, { status: 404 });
    }

    const status = (record.processingStatus || 'queued') as ProcessingStatus;
    const jobCode = status === 'complete' ? 2 : status === 'failed' ? 0 : 1;

    return NextResponse.json({
      success: true,
      job_id: id,
      status: jobCode,
      processingStatus: status,
      progress: processingProgressFor(status),
      errorMessage: record.errorMessage,
      chatReady: status === 'complete' && (record.transcript?.length ?? 0) > 0,
    });
  } catch {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }
}
