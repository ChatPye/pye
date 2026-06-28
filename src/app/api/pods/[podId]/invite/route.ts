import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { requireAurora } from '@/lib/db/require-aurora';
import { createPodInvite, findPodByExternalId } from '@/lib/db/pod-repository';

/** Invite a learner to a pod by email. */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ podId: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    requireAurora('Pod invites');
    const { podId } = await params;
    const body = await request.json();
    const email = typeof body.email === 'string' ? body.email.trim() : '';

    if (!email) {
      return NextResponse.json({ error: 'email is required' }, { status: 400 });
    }

    const pod = await findPodByExternalId(podId);
    if (!pod) {
      return NextResponse.json({ error: 'Pod not found' }, { status: 404 });
    }

    if (pod.ownerId !== userId && !pod.memberIds.includes(userId)) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    if (!pod.settings.allowInvites) {
      return NextResponse.json({ error: 'Invites are disabled for this pod' }, { status: 403 });
    }

    const token = `inv_${Date.now()}_${Math.random().toString(36).slice(2, 14)}`;
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await createPodInvite({
      externalId: podId,
      invitedByClerkId: userId,
      invitedEmail: email,
      token,
      expiresAt,
    });

    const base =
      process.env.NEXT_PUBLIC_APP_URL ||
      process.env.NEXT_PUBLIC_BASE_URL ||
      'http://localhost:3000';
    const inviteUrl = `${base}/pods/invite/${token}`;

    return NextResponse.json({
      success: true,
      token,
      inviteUrl,
      expiresAt: expiresAt.toISOString(),
    });
  } catch (error) {
    console.error('Pod invite error:', error);
    return NextResponse.json({ error: 'Failed to create invite' }, { status: 500 });
  }
}
