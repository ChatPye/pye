import { and, desc, eq } from 'drizzle-orm';
import { getDb, isDatabaseConfigured, schema } from '@/lib/db';

export type BookmarkRecord = {
  id: string;
  videoId: string;
  title: string;
  timestamp: number;
  description: string;
  category: string;
  tags: string[];
  isPublic: boolean;
  thumbnail: string;
  videoTitle: string;
  channelName: string;
  createdAt: Date;
  updatedAt: Date;
  metadata: Record<string, unknown>;
};

function rowToBookmark(row: typeof schema.bookmarks.$inferSelect): BookmarkRecord {
  return {
    id: row.id,
    videoId: row.externalVideoId,
    title: row.title,
    timestamp: row.timestampSeconds,
    description: row.description ?? '',
    category: row.category ?? 'general',
    tags: row.tags ?? [],
    isPublic: row.isPublic,
    thumbnail: row.thumbnailUrl ?? '',
    videoTitle: row.videoTitle ?? '',
    channelName: row.channelName ?? '',
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    metadata: (row.metadata ?? {}) as Record<string, unknown>,
  };
}

export async function listBookmarks(
  ownerClerkId: string,
  filters?: { videoId?: string; category?: string; limit?: number; offset?: number }
): Promise<BookmarkRecord[]> {
  if (!isDatabaseConfigured()) return [];
  const db = getDb();
  const conditions = [eq(schema.bookmarks.ownerClerkId, ownerClerkId)];
  if (filters?.videoId) {
    conditions.push(eq(schema.bookmarks.externalVideoId, filters.videoId));
  }
  if (filters?.category) {
    conditions.push(eq(schema.bookmarks.category, filters.category));
  }

  const rows = await db
    .select()
    .from(schema.bookmarks)
    .where(and(...conditions))
    .orderBy(desc(schema.bookmarks.createdAt))
    .limit(filters?.limit ?? 50)
    .offset(filters?.offset ?? 0);

  return rows.map(rowToBookmark);
}

export async function createBookmark(params: {
  ownerClerkId: string;
  videoId: string;
  title: string;
  timestamp: number;
  description?: string;
  category?: string;
  tags?: string[];
  videoTitle?: string;
  channelName?: string;
  thumbnail?: string;
}): Promise<BookmarkRecord> {
  const db = getDb();
  const now = new Date();
  const [row] = await db
    .insert(schema.bookmarks)
    .values({
      ownerClerkId: params.ownerClerkId,
      externalVideoId: params.videoId,
      title: params.title,
      timestampSeconds: Math.floor(params.timestamp),
      description: params.description ?? '',
      category: params.category ?? 'general',
      tags: params.tags ?? [],
      videoTitle: params.videoTitle ?? null,
      channelName: params.channelName ?? null,
      thumbnailUrl: params.thumbnail ?? null,
      metadata: { timestampFormatted: formatTs(params.timestamp) },
      updatedAt: now,
    })
    .returning();
  return rowToBookmark(row);
}

export async function deleteBookmark(ownerClerkId: string, bookmarkId: string): Promise<boolean> {
  const db = getDb();
  const deleted = await db
    .delete(schema.bookmarks)
    .where(and(eq(schema.bookmarks.id, bookmarkId), eq(schema.bookmarks.ownerClerkId, ownerClerkId)))
    .returning({ id: schema.bookmarks.id });
  return deleted.length > 0;
}

export async function hasVideoBookmark(ownerClerkId: string, videoId: string): Promise<boolean> {
  const db = getDb();
  const [row] = await db
    .select({ id: schema.bookmarks.id })
    .from(schema.bookmarks)
    .where(
      and(
        eq(schema.bookmarks.ownerClerkId, ownerClerkId),
        eq(schema.bookmarks.externalVideoId, videoId),
        eq(schema.bookmarks.timestampSeconds, 0)
      )
    )
    .limit(1);
  return Boolean(row);
}

function formatTs(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${String(secs).padStart(2, '0')}`;
}
