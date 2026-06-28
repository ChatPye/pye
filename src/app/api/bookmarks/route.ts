import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { requireAurora } from '@/lib/db/require-aurora';
import { listBookmarks, createBookmark, deleteBookmark } from '@/lib/db/bookmarks-repository';
import { findVideoByExternalId } from '@/lib/db/video-repository';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const authUser = await requireAuth();
    requireAurora('Bookmarks');

    const { searchParams } = request.url ? new URL(request.url) : { searchParams: new URLSearchParams() };
    const videoId = searchParams.get('videoId') || undefined;
    const category = searchParams.get('category') || undefined;
    const limit = parseInt(searchParams.get('limit') || '50', 10);

    const bookmarks = await listBookmarks(authUser.id, { videoId, category, limit });
    return NextResponse.json({ success: true, bookmarks, total: bookmarks.length });
  } catch (error) {
    console.error('Bookmarks GET error:', error);
    return NextResponse.json({ error: 'Failed to retrieve bookmarks' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const authUser = await requireAuth();
    requireAurora('Bookmarks');

    const body = await request.json();
    const videoId = body.videoId as string;
    const title = body.title as string;
    const timestamp = Number(body.timestamp ?? 0);

    if (!videoId || !title) {
      return NextResponse.json({ error: 'videoId and title required' }, { status: 400 });
    }

    const record = await findVideoByExternalId(videoId);
    const bookmark = await createBookmark({
      ownerClerkId: authUser.id,
      videoId,
      title,
      timestamp,
      description: body.description,
      category: body.category,
      tags: body.tags,
      videoTitle: record?.title,
      channelName: record?.channel,
      thumbnail: record?.thumbnail,
    });

    return NextResponse.json({ success: true, bookmark });
  } catch (error) {
    console.error('Bookmark POST error:', error);
    return NextResponse.json({ error: 'Failed to create bookmark' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const authUser = await requireAuth();
    requireAurora('Bookmarks');

    const bookmarkId = request.nextUrl.searchParams.get('bookmarkId');
    if (!bookmarkId) {
      return NextResponse.json({ error: 'bookmarkId required' }, { status: 400 });
    }

    const ok = await deleteBookmark(authUser.id, bookmarkId);
    if (!ok) {
      return NextResponse.json({ error: 'Bookmark not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Bookmark DELETE error:', error);
    return NextResponse.json({ error: 'Failed to delete bookmark' }, { status: 500 });
  }
}
