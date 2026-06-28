import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { requireAurora } from '@/lib/db/require-aurora';
import { acceptPodInvite } from '@/lib/db/pod-repository';

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    requireAurora('Pod invite accept');
    const { token } = await params;
    const podId = await acceptPodInvite(token, userId);

    if (!podId) {
      return NextResponse.json({ error: 'Invite invalid or expired' }, { status: 410 });
    }

    return NextResponse.json({ success: true, podId });
  } catch (error) {
    console.error('Accept invite error:', error);
    return NextResponse.json({ error: 'Failed to accept invite' }, { status: 500 });
  }
}
