import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { requireAurora } from '@/lib/db/require-aurora';
import { findPodShare } from '@/lib/db/pod-repository';

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ shareId: string }> }
) {
  try {
    requireAurora('Pod shares');
    const { shareId } = await context.params;
    const rec = await findPodShare(shareId);

    if (!rec) {
      return NextResponse.json({ success: false, error: 'Not found or expired' }, { status: 404 });
    }

    if (rec.share.expiresAt && rec.share.expiresAt < new Date()) {
      return NextResponse.json({ success: false, error: 'Share expired' }, { status: 410 });
    }

    if (rec.share.access === 'invite') {
      const { userId } = await auth();
      if (!userId) {
        return NextResponse.json({ success: false, error: 'Auth required' }, { status: 401 });
      }
    }

    return NextResponse.json({
      success: true,
      podId: rec.externalPodId,
      access: rec.share.access,
    });
  } catch (error) {
    console.error('Pod share lookup error:', error);
    return NextResponse.json({ success: false, error: 'Failed to load share' }, { status: 500 });
  }
}
