import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { connectDocumentDB } from '@/server/db/documentdb';
import { Pod, CreatePodRequest, PodResponse } from '@/lib/types/pod';

// In-memory store for development when DocumentDB is unavailable
let inMemoryPods: Pod[] = [];

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let pods: Pod[] = [];

    try {
      // Try to connect to DocumentDB
      const db = await connectDocumentDB();
      if (!db) {
        throw new Error('Database connection failed');
      }
      const podsCollection = db.connection.db?.collection('pods');
      if (!podsCollection) {
        throw new Error('Database collection not available');
      }
      
      // Find pods where user is owner or member
      pods = await podsCollection.find({
        $or: [
          { ownerId: userId },
          { memberIds: userId }
        ]
      }).toArray() as unknown as Pod[];
    } catch (error) {
      console.warn('DocumentDB unavailable, using in-memory store:', error);
      // Fallback to in-memory store
      pods = inMemoryPods.filter(pod => 
        pod.ownerId === userId || pod.memberIds.includes(userId)
      );
    }

    return NextResponse.json({ success: true, pods } as PodResponse);
  } catch (error) {
    console.error('Error fetching pods:', error);
    return NextResponse.json({ error: 'Failed to fetch pods' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body: any = await request.json();
    const { title, description, settings, metadata, videos, skills, rewards, resources } = body;

    if (!title || title.trim().length === 0) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 });
    }

    const newPod: Pod = {
      id: `pod_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      title: title.trim(),
      description: description?.trim(),
      ownerId: userId,
      memberIds: [userId], // Owner is automatically a member
      videos: videos || [],
      skills: skills || [],
      rewards: rewards || [],
      resources: resources || [],
      createdAt: new Date(),
      updatedAt: new Date(),
        settings: {
          isPublic: settings?.isPublic ?? false,
          allowInvites: settings?.allowInvites ?? true,
          maxMembers: settings?.maxMembers ?? 50,
        },
      metadata: {
        color: '#3b82f6',
        icon: 'users',
        tags: [],
        ...metadata
      }
    };

    try {
      // Try to save to DocumentDB
      const db = await connectDocumentDB();
      if (!db) {
        throw new Error('Database connection failed');
      }
      const podsCollection = db.connection.db?.collection('pods');
      if (!podsCollection) {
        throw new Error('Database collection not available');
      }
      await podsCollection.insertOne(newPod);
    } catch (error) {
      console.warn('DocumentDB unavailable, using in-memory store:', error);
      // Fallback to in-memory store
      inMemoryPods.push(newPod);
    }

    return NextResponse.json({ success: true, pod: newPod } as PodResponse);
  } catch (error) {
    console.error('Error creating pod:', error);
    return NextResponse.json({ error: 'Failed to create pod' }, { status: 500 });
  }
}
