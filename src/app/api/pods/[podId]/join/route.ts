import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { requireAurora } from '@/lib/db/require-aurora';
import {
  addPodMember,
  findPodByExternalId,
  isPodMember,
} from '@/lib/db/pod-repository';

/** Join a pod directly (public pods or owner). */
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ podId: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    requireAurora('Pod join');
    const { podId } = await params;
    const pod = await findPodByExternalId(podId);

    if (!pod) {
      return NextResponse.json({ error: 'Pod not found' }, { status: 404 });
    }

    if (await isPodMember(podId, userId)) {
      return NextResponse.json({ success: true, message: 'Already a member', podId });
    }

    if (!pod.settings.isPublic && pod.ownerId !== userId) {
      return NextResponse.json(
        { error: 'This pod requires an invite. Ask the owner for a link.' },
        { status: 403 }
      );
    }

    if (pod.memberIds.length >= (pod.settings.maxMembers ?? 50)) {
      return NextResponse.json({ error: 'Pod is full' }, { status: 403 });
    }

    await addPodMember(podId, userId);
    const updated = await findPodByExternalId(podId);

    return NextResponse.json({ success: true, pod: updated });
  } catch (error) {
    console.error('Pod join error:', error);
    return NextResponse.json({ error: 'Failed to join pod' }, { status: 500 });
  }
}
