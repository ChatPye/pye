import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import {
  deletePod,
  findPodByExternalId,
  isPodMember,
  updatePod,
} from '@/lib/db/pod-repository';
import type { PodResponse, UpdatePodRequest } from '@/lib/types/pod';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ podId: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { podId } = await params;
    const pod = await findPodByExternalId(podId);

    if (!pod) {
      return NextResponse.json({ error: 'Pod not found' }, { status: 404 });
    }

    if (pod.ownerId !== userId && !pod.memberIds.includes(userId)) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    return NextResponse.json({ success: true, pod } as PodResponse);
  } catch (error) {
    console.error('Error fetching pod:', error);
    return NextResponse.json({ error: 'Failed to fetch pod' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ podId: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { podId } = await params;
    const body: UpdatePodRequest = await request.json();
    const pod = await findPodByExternalId(podId);

    if (!pod) {
      return NextResponse.json({ error: 'Pod not found' }, { status: 404 });
    }

    if (pod.ownerId !== userId) {
      return NextResponse.json({ error: 'Only the owner can update this pod' }, { status: 403 });
    }

    const updatedPod = await updatePod(podId, {
      title: body.title?.trim() || pod.title,
      description: body.description?.trim() || pod.description,
      videos: body.videos !== undefined ? body.videos : pod.videos,
      skills: body.skills !== undefined ? body.skills : pod.skills,
      rewards: body.rewards !== undefined ? body.rewards : pod.rewards,
      resources: body.resources !== undefined ? body.resources : pod.resources,
      settings: {
        isPublic: body.settings?.isPublic ?? pod.settings.isPublic,
        allowInvites: body.settings?.allowInvites ?? pod.settings.allowInvites,
        maxMembers: body.settings?.maxMembers ?? pod.settings.maxMembers,
      },
      metadata: { ...pod.metadata, ...body.metadata },
    });

    return NextResponse.json({ success: true, pod: updatedPod } as PodResponse);
  } catch (error) {
    console.error('Error updating pod:', error);
    return NextResponse.json({ error: 'Failed to update pod' }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ podId: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { podId } = await params;
    const pod = await findPodByExternalId(podId);

    if (!pod) {
      return NextResponse.json({ error: 'Pod not found' }, { status: 404 });
    }

    if (pod.ownerId !== userId) {
      return NextResponse.json({ error: 'Only the owner can delete this pod' }, { status: 403 });
    }

    await deletePod(podId);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting pod:', error);
    return NextResponse.json({ error: 'Failed to delete pod' }, { status: 500 });
  }
}
