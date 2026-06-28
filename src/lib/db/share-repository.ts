import { eq } from 'drizzle-orm';
import { getDb, isDatabaseConfigured, schema } from '@/lib/db';

export type ShareLinkRecord = {
  shareId: string;
  tenantId?: string | null;
  ownerClerkId: string;
  externalVideoId: string;
  type: string;
  content: string;
  expiresAt?: Date | null;
  createdAt: Date;
};

export async function createShareLink(data: ShareLinkRecord): Promise<ShareLinkRecord> {
  const db = getDb();
  const [row] = await db
    .insert(schema.shareLinks)
    .values({
      shareId: data.shareId,
      tenantId: data.tenantId ?? null,
      ownerClerkId: data.ownerClerkId,
      externalVideoId: data.externalVideoId,
      type: data.type,
      content: data.content,
      expiresAt: data.expiresAt ?? null,
    })
    .returning();
  return {
    shareId: row.shareId,
    tenantId: row.tenantId,
    ownerClerkId: row.ownerClerkId,
    externalVideoId: row.externalVideoId,
    type: row.type,
    content: row.content,
    expiresAt: row.expiresAt,
    createdAt: row.createdAt,
  };
}

export async function findShareLink(shareId: string): Promise<ShareLinkRecord | null> {
  if (!isDatabaseConfigured()) return null;
  const db = getDb();
  const [row] = await db
    .select()
    .from(schema.shareLinks)
    .where(eq(schema.shareLinks.shareId, shareId))
    .limit(1);
  if (!row) return null;
  return {
    shareId: row.shareId,
    tenantId: row.tenantId,
    ownerClerkId: row.ownerClerkId,
    externalVideoId: row.externalVideoId,
    type: row.type,
    content: row.content,
    expiresAt: row.expiresAt,
    createdAt: row.createdAt,
  };
}
