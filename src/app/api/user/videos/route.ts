import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { getDb, isDatabaseConfigured, schema } from '@/lib/db';
import { desc, eq, inArray } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const authUser = await requireAuth();
    const limit = Math.min(
      50,
      parseInt(request.nextUrl.searchParams.get('limit') || '20', 10) || 20
    );

    if (!isDatabaseConfigured()) {
      return NextResponse.json({ success: true, videos: [] });
    }

    const db = getDb();
    const ownedRows = await db
      .select({
        videoId: schema.videos.externalId,
        title: schema.videos.title,
        processingStatus: schema.videos.processingStatus,
        source: schema.videos.source,
        updatedAt: schema.videos.updatedAt,
        createdAt: schema.videos.createdAt,
      })
      .from(schema.videos)
      .where(eq(schema.videos.ownerClerkId, authUser.id))
      .orderBy(desc(schema.videos.updatedAt))
      .limit(limit);

    const recentEvents = await db
      .select({ payload: schema.learningEvents.payload, createdAt: schema.learningEvents.createdAt })
      .from(schema.learningEvents)
      .where(eq(schema.learningEvents.ownerClerkId, authUser.id))
      .orderBy(desc(schema.learningEvents.createdAt))
      .limit(100);
    const viewedIds = [...new Set(recentEvents.map((event) => String((event.payload as Record<string, unknown>)?.externalVideoId ?? '')).filter(Boolean))];
    const viewedRows = viewedIds.length ? await db
      .select({ videoId: schema.videos.externalId, title: schema.videos.title, processingStatus: schema.videos.processingStatus, source: schema.videos.source, updatedAt: schema.videos.updatedAt, createdAt: schema.videos.createdAt })
      .from(schema.videos)
      .where(inArray(schema.videos.externalId, viewedIds.slice(0, limit))) : [];
    const rows = [...ownedRows, ...viewedRows.filter((row) => !ownedRows.some((owned) => owned.videoId === row.videoId))].slice(0, limit);
    const videos = rows.map((row) => ({
      id: row.videoId,
      title: row.title,
      processingStatus: row.processingStatus,
      source: row.source,
      updated: formatRelative(row.updatedAt ?? row.createdAt),
    }));

    return NextResponse.json({ success: true, videos });
  } catch (error) {
    console.error('List user videos error:', error);
    return NextResponse.json({ success: false, error: 'Failed to list videos' }, { status: 500 });
  }
}

function formatRelative(date: Date): string {
  const diffMs = Date.now() - date.getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 48) return `${hours}h ago`;
  return date.toLocaleDateString();
}
