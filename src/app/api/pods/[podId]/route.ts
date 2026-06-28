import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { connectDocumentDB } from '@/server/db/documentdb';
import { Pod, UpdatePodRequest, PodResponse } from '@/lib/types/pod';

// In-memory store for development when DocumentDB is unavailable
let inMemoryPods: Pod[] = [];

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ podId: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { podId } = await params;
    let pod: Pod | null = null;

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
      pod = await podsCollection.findOne({ id: podId }) as Pod | null;
    } catch (error) {
      console.warn('DocumentDB unavailable, using in-memory store:', error);
      // Fallback to in-memory store
      pod = inMemoryPods.find(p => p.id === podId) || null;
    }

    if (!pod) {
      return NextResponse.json({ error: 'Pod not found' }, { status: 404 });
    }

    // Check if user has access to this pod
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

    let pod: Pod | null = null;

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
      pod = await podsCollection.findOne({ id: podId }) as Pod | null;
    } catch (error) {
      console.warn('DocumentDB unavailable, using in-memory store:', error);
      // Fallback to in-memory store
      pod = inMemoryPods.find(p => p.id === podId) || null;
    }

    if (!pod) {
      return NextResponse.json({ error: 'Pod not found' }, { status: 404 });
    }

    // Check if user is the owner
    if (pod.ownerId !== userId) {
      return NextResponse.json({ error: 'Only the owner can update this pod' }, { status: 403 });
    }

    // Update pod
    const updatedPod: Pod = {
      ...pod,
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
      metadata: {
        ...pod.metadata,
        ...body.metadata
      },
      updatedAt: new Date()
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
      await podsCollection.updateOne(
        { id: podId },
        { $set: updatedPod }
      );
    } catch (error) {
      console.warn('DocumentDB unavailable, using in-memory store:', error);
      // Fallback to in-memory store
      const index = inMemoryPods.findIndex(p => p.id === podId);
      if (index !== -1) {
        inMemoryPods[index] = updatedPod;
      }
    }

    return NextResponse.json({ success: true, pod: updatedPod } as PodResponse);
  } catch (error) {
    console.error('Error updating pod:', error);
    return NextResponse.json({ error: 'Failed to update pod' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ podId: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { podId } = await params;

    let pod: Pod | null = null;

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
      pod = await podsCollection.findOne({ id: podId }) as Pod | null;
    } catch (error) {
      console.warn('DocumentDB unavailable, using in-memory store:', error);
      // Fallback to in-memory store
      pod = inMemoryPods.find(p => p.id === podId) || null;
    }

    if (!pod) {
      return NextResponse.json({ error: 'Pod not found' }, { status: 404 });
    }

    // Check if user is the owner
    if (pod.ownerId !== userId) {
      return NextResponse.json({ error: 'Only the owner can delete this pod' }, { status: 403 });
    }

    try {
      // Try to delete from DocumentDB
      const db = await connectDocumentDB();
      if (!db) {
        throw new Error('Database connection failed');
      }
      const podsCollection = db.connection.db?.collection('pods');
      if (!podsCollection) {
        throw new Error('Database collection not available');
      }
      await podsCollection.deleteOne({ id: podId });
    } catch (error) {
      console.warn('DocumentDB unavailable, using in-memory store:', error);
      // Fallback to in-memory store
      inMemoryPods = inMemoryPods.filter(p => p.id !== podId);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting pod:', error);
    return NextResponse.json({ error: 'Failed to delete pod' }, { status: 500 });
  }
}
