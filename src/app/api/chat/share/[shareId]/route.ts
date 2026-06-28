import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getUserPlanAndTenant } from '@/lib/plans';
import { requireAurora } from '@/lib/db/require-aurora';
import { findShareLink } from '@/lib/db/share-repository';

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ shareId: string }> }
) {
  try {
    requireAurora('Chat share');
    const { userId } = await auth();
    const { shareId } = await context.params;

    const shareData = await findShareLink(shareId);

    if (!shareData) {
      return NextResponse.json({ error: 'Share not found or expired' }, { status: 404 });
    }

    if (shareData.expiresAt && shareData.expiresAt < new Date()) {
      return NextResponse.json({ error: 'Share expired' }, { status: 410 });
    }

    const isOwner = userId && shareData.ownerClerkId === userId;
    const isPublic = shareData.type === 'public';
    let hasPlanAccess = false;

    if (!isOwner && !isPublic) {
      if (userId) {
        const planInfo = await getUserPlanAndTenant(userId);
        if (
          planInfo &&
          (planInfo.plan?.startsWith('enterprise') || planInfo.plan === 'business_team')
        ) {
          hasPlanAccess = true;
        }
      }
      if (!hasPlanAccess) {
        return NextResponse.json({ error: 'Access denied' }, { status: 403 });
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        id: shareData.shareId,
        content: shareData.content,
        videoId: shareData.externalVideoId,
        type: shareData.type,
        userId: shareData.ownerClerkId,
        createdAt: shareData.createdAt,
        expiresAt: shareData.expiresAt,
      },
    });
  } catch (error) {
    console.error('Error fetching share:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
