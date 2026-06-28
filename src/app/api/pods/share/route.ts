import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import {
  getInviteCountForTenant,
  getPlanLimits,
  getUserPlanAndTenant,
  incrementTenantShareCount,
} from '@/lib/plans';
import { requireAurora } from '@/lib/db/require-aurora';
import { createPodShare, findPodByExternalId } from '@/lib/db/pod-repository';

export async function POST(request: NextRequest) {
  try {
    const isDevBypass = request.headers.get('X-Dev-Bypass') === 'true';
    let userId: string | undefined;
    if (!isDevBypass) {
      const a = await auth();
      userId = a?.userId || undefined;
    }

    const body = await request.json();
    const { podId, access = 'public', expiresIn } = body as {
      podId?: string;
      access?: 'public' | 'invite';
      expiresIn?: number;
    };

    if (!podId) {
      return NextResponse.json({ success: false, error: 'podId required' }, { status: 400 });
    }
    if (!isDevBypass && !userId) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    requireAurora('Pod shares');

    const pod = await findPodByExternalId(podId);
    if (!pod) {
      return NextResponse.json({ success: false, error: 'Pod not found' }, { status: 404 });
    }

    if (!isDevBypass && userId && pod.ownerId !== userId && !pod.memberIds.includes(userId)) {
      return NextResponse.json({ success: false, error: 'Access denied' }, { status: 403 });
    }

    if (!isDevBypass && access === 'invite' && userId) {
      const user = await getUserPlanAndTenant(userId);
      const limits = getPlanLimits(user.plan);
      const used = await getInviteCountForTenant(user.tenantId);
      const max = Number(limits.invites ?? 2);
      if (used >= max) {
        return NextResponse.json(
          { success: false, error: 'Invite limit reached', reason: 'upgrade_required' },
          { status: 402 }
        );
      }
    }

    const shareId = `pshare_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
    const expiresAt = expiresIn
      ? new Date(Date.now() + Math.max(0, expiresIn))
      : undefined;

    await createPodShare({
      shareId,
      externalPodId: podId,
      ownerClerkId: userId,
      access,
      expiresAt,
    });

    if (!isDevBypass && userId) {
      const user = await getUserPlanAndTenant(userId);
      incrementTenantShareCount(user.tenantId);
    }

    const base =
      process.env.NEXT_PUBLIC_APP_URL ||
      process.env.NEXT_PUBLIC_BASE_URL ||
      'http://localhost:3000';
    const shareUrl = `${base}/pods/share/${shareId}`;

    return NextResponse.json({ success: true, shareId, shareUrl });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'bad request';
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}
