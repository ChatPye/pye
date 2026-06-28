import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { requireAurora } from '@/lib/db/require-aurora';
import { findVideoByExternalId } from '@/lib/db/video-repository';
import {
  createBookmark,
  hasVideoBookmark,
  deleteBookmark,
  listBookmarks,
} from '@/lib/db/bookmarks-repository';
import { awardXp } from '@/lib/db/xp-repository';

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    requireAurora('Bookmarks');

    const body = await request.json();
    const videoId = typeof body.videoId === 'string' ? body.videoId.trim() : '';
    const timestamp = typeof body.timestamp === 'number' ? body.timestamp : 0;

    if (!videoId) {
      return NextResponse.json({ error: 'Video ID is required' }, { status: 400 });
    }

    const existing = await hasVideoBookmark(userId, videoId);
    if (existing && timestamp === 0) {
      const bookmarks = await listBookmarks(userId, { videoId, limit: 1 });
      if (bookmarks[0]) {
        await deleteBookmark(userId, bookmarks[0].id);
      }
      return NextResponse.json({ success: true, message: 'Bookmark removed', removed: true });
    }

    const record = await findVideoByExternalId(videoId);
    const bookmark = await createBookmark({
      ownerClerkId: userId,
      videoId,
      title: record?.title || `Bookmark at ${timestamp}s`,
      timestamp,
      videoTitle: record?.title,
      channelName: record?.channel,
      thumbnail: record?.thumbnail,
    });

    await awardXp(userId, 'bookmark_created', { videoId }).catch(() => null);

    return NextResponse.json({ success: true, bookmark, message: 'Video bookmarked' });
  } catch (error) {
    console.error('Bookmark action error:', error);
    return NextResponse.json({ error: 'Failed to process action' }, { status: 500 });
  }
}
