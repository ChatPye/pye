import { and, desc, eq } from 'drizzle-orm';
import { getDb, isDatabaseConfigured, schema } from '@/lib/db';

export type ChatMessage = {
  id: string;
  type: 'user' | 'ai';
  content: string;
  timestamp?: string;
  metadata?: Record<string, unknown>;
};

export type ChatSession = {
  clerkUserId: string;
  externalVideoId: string;
  sessionId: string;
  messages: ChatMessage[];
  videoMetadata: Record<string, unknown>;
  isActive: boolean;
  lastActivity: Date;
};

export async function findLatestChatSession(
  clerkUserId: string,
  externalVideoId: string
): Promise<ChatSession | null> {
  if (!isDatabaseConfigured()) return null;
  const db = getDb();
  const [row] = await db
    .select()
    .from(schema.chatSessions)
    .where(
      and(
        eq(schema.chatSessions.clerkUserId, clerkUserId),
        eq(schema.chatSessions.externalVideoId, externalVideoId),
        eq(schema.chatSessions.isActive, true)
      )
    )
    .orderBy(desc(schema.chatSessions.lastActivity))
    .limit(1);

  if (!row) return null;
  return {
    clerkUserId: row.clerkUserId,
    externalVideoId: row.externalVideoId,
    sessionId: row.sessionId,
    messages: (row.messages ?? []) as ChatMessage[],
    videoMetadata: (row.videoMetadata ?? {}) as Record<string, unknown>,
    isActive: row.isActive,
    lastActivity: row.lastActivity,
  };
}

export async function getChatSession(
  clerkUserId: string,
  externalVideoId: string,
  sessionId: string
): Promise<ChatSession | null> {
  if (!isDatabaseConfigured()) return null;
  const db = getDb();
  const [row] = await db
    .select()
    .from(schema.chatSessions)
    .where(
      and(
        eq(schema.chatSessions.clerkUserId, clerkUserId),
        eq(schema.chatSessions.externalVideoId, externalVideoId),
        eq(schema.chatSessions.sessionId, sessionId)
      )
    )
    .limit(1);

  if (!row) return null;
  return {
    clerkUserId: row.clerkUserId,
    externalVideoId: row.externalVideoId,
    sessionId: row.sessionId,
    messages: (row.messages ?? []) as ChatMessage[],
    videoMetadata: (row.videoMetadata ?? {}) as Record<string, unknown>,
    isActive: row.isActive,
    lastActivity: row.lastActivity,
  };
}

export async function upsertChatSession(session: ChatSession): Promise<void> {
  const db = getDb();
  const now = new Date();
  const existing = await getChatSession(
    session.clerkUserId,
    session.externalVideoId,
    session.sessionId
  );

  if (existing) {
    await db
      .update(schema.chatSessions)
      .set({
        messages: session.messages,
        videoMetadata: session.videoMetadata,
        isActive: session.isActive,
        lastActivity: now,
        updatedAt: now,
      })
      .where(
        and(
          eq(schema.chatSessions.clerkUserId, session.clerkUserId),
          eq(schema.chatSessions.externalVideoId, session.externalVideoId),
          eq(schema.chatSessions.sessionId, session.sessionId)
        )
      );
    return;
  }

  await db.insert(schema.chatSessions).values({
    clerkUserId: session.clerkUserId,
    externalVideoId: session.externalVideoId,
    sessionId: session.sessionId,
    messages: session.messages,
    videoMetadata: session.videoMetadata,
    isActive: session.isActive,
    lastActivity: now,
  });
}

export async function deleteChatSession(
  clerkUserId: string,
  externalVideoId: string,
  sessionId?: string
): Promise<void> {
  const db = getDb();
  if (sessionId) {
    await db
      .delete(schema.chatSessions)
      .where(
        and(
          eq(schema.chatSessions.clerkUserId, clerkUserId),
          eq(schema.chatSessions.externalVideoId, externalVideoId),
          eq(schema.chatSessions.sessionId, sessionId)
        )
      );
    return;
  }
  await db
    .delete(schema.chatSessions)
    .where(
      and(
        eq(schema.chatSessions.clerkUserId, clerkUserId),
        eq(schema.chatSessions.externalVideoId, externalVideoId)
      )
    );
}
