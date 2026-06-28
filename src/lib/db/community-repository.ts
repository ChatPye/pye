import { and, desc, eq } from 'drizzle-orm';
import { getDb, isDatabaseConfigured, schema } from '@/lib/db';

export type CommunityThread = {
  id: string;
  videoId: string;
  title: string;
  content: string;
  authorId: string;
  authorName?: string;
  isPinned?: boolean;
  createdAt: string;
  updatedAt: string;
  replies: Array<{
    id: string;
    authorId: string;
    authorName?: string;
    content: string;
    createdAt: string;
  }>;
};

function rowToThread(row: typeof schema.communityThreads.$inferSelect): CommunityThread {
  return {
    id: row.id,
    videoId: row.externalVideoId,
    title: row.title,
    content: row.content,
    authorId: row.authorClerkId,
    authorName: row.authorName ?? undefined,
    isPinned: row.isPinned,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    replies: (row.replies ?? []).map((r) => ({
      id: r.id,
      authorId: r.authorClerkId,
      authorName: r.authorName,
      content: r.content,
      createdAt: r.createdAt,
    })),
  };
}

export async function listThreadsForVideo(videoId: string): Promise<CommunityThread[]> {
  if (!isDatabaseConfigured()) return [];
  const db = getDb();
  const rows = await db
    .select()
    .from(schema.communityThreads)
    .where(eq(schema.communityThreads.externalVideoId, videoId))
    .orderBy(desc(schema.communityThreads.isPinned), desc(schema.communityThreads.updatedAt));
  return rows.map(rowToThread);
}

export async function createThread(params: {
  videoId: string;
  title: string;
  content: string;
  authorClerkId: string;
  authorName?: string;
}): Promise<CommunityThread> {
  const db = getDb();
  const now = new Date();
  const [row] = await db
    .insert(schema.communityThreads)
    .values({
      externalVideoId: params.videoId,
      title: params.title,
      content: params.content,
      authorClerkId: params.authorClerkId,
      authorName: params.authorName ?? null,
      updatedAt: now,
    })
    .returning();
  return rowToThread(row);
}
