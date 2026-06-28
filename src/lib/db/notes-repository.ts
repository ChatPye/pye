import { and, eq } from 'drizzle-orm';
import { getDb, isDatabaseConfigured, schema } from '@/lib/db';

const memoryNotes = new Map<string, { content: string; updatedAt: number }>();

function noteKey(ownerClerkId: string, externalVideoId: string) {
  return `${ownerClerkId}:${externalVideoId}`;
}

export async function getVideoNote(
  ownerClerkId: string,
  externalVideoId: string
): Promise<{ content: string; updatedAt: Date } | null> {
  if (isDatabaseConfigured()) {
    try {
      const db = getDb();
      const [row] = await db
        .select()
        .from(schema.videoNotes)
        .where(
          and(
            eq(schema.videoNotes.ownerClerkId, ownerClerkId),
            eq(schema.videoNotes.externalVideoId, externalVideoId)
          )
        )
        .limit(1);
      if (!row) return null;
      return { content: row.content, updatedAt: row.updatedAt };
    } catch {
      /* fall through to memory */
    }
  }

  const hit = memoryNotes.get(noteKey(ownerClerkId, externalVideoId));
  if (!hit) return null;
  return { content: hit.content, updatedAt: new Date(hit.updatedAt) };
}

export async function saveVideoNote(
  ownerClerkId: string,
  externalVideoId: string,
  content: string
): Promise<{ content: string; updatedAt: Date }> {
  const now = new Date();

  if (isDatabaseConfigured()) {
    try {
      const db = getDb();
      const [existing] = await db
        .select({ id: schema.videoNotes.id })
        .from(schema.videoNotes)
        .where(
          and(
            eq(schema.videoNotes.ownerClerkId, ownerClerkId),
            eq(schema.videoNotes.externalVideoId, externalVideoId)
          )
        )
        .limit(1);

      if (existing) {
        await db
          .update(schema.videoNotes)
          .set({ content, updatedAt: now })
          .where(eq(schema.videoNotes.id, existing.id));
      } else {
        await db.insert(schema.videoNotes).values({
          ownerClerkId,
          externalVideoId,
          content,
        });
      }
      return { content, updatedAt: now };
    } catch {
      /* fall through to memory */
    }
  }

  memoryNotes.set(noteKey(ownerClerkId, externalVideoId), {
    content,
    updatedAt: now.getTime(),
  });
  return { content, updatedAt: now };
}
