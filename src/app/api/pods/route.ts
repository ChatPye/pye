import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { requireAurora } from '@/lib/db/require-aurora';
import {
  createPod,
  listPodsForUser,
} from '@/lib/db/pod-repository';
import type { CreatePodRequest, PodResponse } from '@/lib/types/pod';

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    requireAurora('Pods');
    const pods = await listPodsForUser(userId);
    return NextResponse.json({ success: true, pods } as PodResponse);
  } catch (error) {
    console.error('Error fetching pods:', error);
    const message = error instanceof Error ? error.message : 'Failed to fetch pods';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    requireAurora('Pods');

    const body = (await request.json()) as CreatePodRequest & {
      videos?: string[];
      skills?: string[];
      rewards?: string[];
      resources?: string[];
    };
    const { title, description, settings, metadata, videos, skills, rewards, resources } = body;

    if (!title || title.trim().length === 0) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 });
    }

    const pod = await createPod({
      id: `pod_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`,
      title: title.trim(),
      description: description?.trim(),
      ownerId: userId,
      memberIds: [userId],
      videos: videos || [],
      skills: skills || [],
      rewards: rewards || [],
      resources: resources || [],
      settings: {
        isPublic: settings?.isPublic ?? false,
        allowInvites: settings?.allowInvites ?? true,
        maxMembers: settings?.maxMembers ?? 50,
      },
      metadata: {
        color: '#3b82f6',
        icon: 'users',
        tags: [],
        ...metadata,
      },
    });

    return NextResponse.json({ success: true, pod } as PodResponse);
  } catch (error) {
    console.error('Error creating pod:', error);
    const message = error instanceof Error ? error.message : 'Failed to create pod';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
