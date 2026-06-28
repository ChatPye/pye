import { and, eq, inArray, or } from 'drizzle-orm';
import { getDb, isDatabaseConfigured, schema } from '@/lib/db';
import type { Pod } from '@/lib/types/pod';

function rowToPod(
  row: typeof schema.pods.$inferSelect,
  memberIds: string[]
): Pod {
  return {
    id: row.externalId,
    title: row.title,
    description: row.description ?? undefined,
    ownerId: row.ownerClerkId,
    memberIds,
    videos: row.videos ?? [],
    skills: row.skills ?? [],
    rewards: row.rewards ?? [],
    resources: row.resources ?? [],
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    settings: row.settings ?? {
      isPublic: false,
      allowInvites: true,
      maxMembers: 50,
    },
    metadata: row.metadata ?? {},
  };
}

async function memberIdsForPod(podUuid: string): Promise<string[]> {
  const db = getDb();
  const rows = await db
    .select({ clerkUserId: schema.podMembers.clerkUserId })
    .from(schema.podMembers)
    .where(eq(schema.podMembers.podId, podUuid));
  return rows.map((r) => r.clerkUserId);
}

async function getPodUuid(externalId: string): Promise<string | null> {
  const db = getDb();
  const [row] = await db
    .select({ id: schema.pods.id })
    .from(schema.pods)
    .where(eq(schema.pods.externalId, externalId))
    .limit(1);
  return row?.id ?? null;
}

export async function listPodsForUser(clerkUserId: string): Promise<Pod[]> {
  if (!isDatabaseConfigured()) return [];
  const db = getDb();

  const memberPodIds = await db
    .select({ podId: schema.podMembers.podId })
    .from(schema.podMembers)
    .where(eq(schema.podMembers.clerkUserId, clerkUserId));

  const podUuids = memberPodIds.map((m) => m.podId);

  const rows = await db
    .select()
    .from(schema.pods)
    .where(
      podUuids.length
        ? or(
            eq(schema.pods.ownerClerkId, clerkUserId),
            inArray(schema.pods.id, podUuids)
          )
        : eq(schema.pods.ownerClerkId, clerkUserId)
    );

  const result: Pod[] = [];
  for (const row of rows) {
    result.push(rowToPod(row, await memberIdsForPod(row.id)));
  }
  return result;
}

export async function findPodByExternalId(externalId: string): Promise<Pod | null> {
  if (!isDatabaseConfigured()) return null;
  const db = getDb();
  const [row] = await db
    .select()
    .from(schema.pods)
    .where(eq(schema.pods.externalId, externalId))
    .limit(1);
  if (!row) return null;
  return rowToPod(row, await memberIdsForPod(row.id));
}

export async function createPod(
  pod: Omit<Pod, 'createdAt' | 'updatedAt'> & { createdAt?: Date; updatedAt?: Date }
): Promise<Pod> {
  const db = getDb();
  const now = new Date();
  const [inserted] = await db
    .insert(schema.pods)
    .values({
      externalId: pod.id,
      ownerClerkId: pod.ownerId,
      title: pod.title,
      description: pod.description ?? null,
      settings: pod.settings,
      metadata: pod.metadata,
      videos: pod.videos ?? [],
      skills: pod.skills ?? [],
      resources: pod.resources ?? [],
      rewards: pod.rewards ?? [],
      createdAt: now,
      updatedAt: now,
    })
    .returning();

  await db.insert(schema.podMembers).values({
    podId: inserted.id,
    clerkUserId: pod.ownerId,
    role: 'owner',
    permissions: {
      canInvite: true,
      canManageResources: true,
      canCreateThreads: true,
    },
  });

  return rowToPod(inserted, pod.memberIds.length ? pod.memberIds : [pod.ownerId]);
}

export async function updatePod(externalId: string, updates: Partial<Pod>): Promise<Pod | null> {
  const db = getDb();
  const podUuid = await getPodUuid(externalId);
  if (!podUuid) return null;

  const [updated] = await db
    .update(schema.pods)
    .set({
      title: updates.title,
      description: updates.description,
      settings: updates.settings,
      metadata: updates.metadata,
      videos: updates.videos,
      skills: updates.skills,
      resources: updates.resources,
      rewards: updates.rewards,
      updatedAt: new Date(),
    })
    .where(eq(schema.pods.externalId, externalId))
    .returning();

  if (!updated) return null;
  return rowToPod(updated, await memberIdsForPod(podUuid));
}

export async function deletePod(externalId: string): Promise<boolean> {
  const db = getDb();
  const deleted = await db
    .delete(schema.pods)
    .where(eq(schema.pods.externalId, externalId))
    .returning({ id: schema.pods.id });
  return deleted.length > 0;
}

export async function addPodMember(
  externalId: string,
  clerkUserId: string,
  role: 'admin' | 'member' = 'member'
): Promise<boolean> {
  const podUuid = await getPodUuid(externalId);
  if (!podUuid) return false;
  const db = getDb();

  await db
    .insert(schema.podMembers)
    .values({
      podId: podUuid,
      clerkUserId,
      role,
      permissions: {
        canInvite: role === 'admin',
        canManageResources: role === 'admin',
        canCreateThreads: true,
      },
    })
    .onConflictDoNothing();

  return true;
}

export async function isPodMember(externalId: string, clerkUserId: string): Promise<boolean> {
  const podUuid = await getPodUuid(externalId);
  if (!podUuid) return false;
  const db = getDb();
  const [row] = await db
    .select({ id: schema.podMembers.id })
    .from(schema.podMembers)
    .where(
      and(
        eq(schema.podMembers.podId, podUuid),
        eq(schema.podMembers.clerkUserId, clerkUserId)
      )
    )
    .limit(1);
  return Boolean(row);
}

export async function createPodInvite(params: {
  externalId: string;
  invitedByClerkId: string;
  invitedEmail?: string;
  invitedClerkId?: string;
  token: string;
  expiresAt: Date;
}) {
  const podUuid = await getPodUuid(params.externalId);
  if (!podUuid) return null;
  const db = getDb();
  const [row] = await db
    .insert(schema.podInvites)
    .values({
      podId: podUuid,
      invitedByClerkId: params.invitedByClerkId,
      invitedEmail: params.invitedEmail ?? null,
      invitedClerkId: params.invitedClerkId ?? null,
      token: params.token,
      expiresAt: params.expiresAt,
      status: 'pending',
    })
    .returning();
  return row;
}

export async function acceptPodInvite(token: string, clerkUserId: string): Promise<string | null> {
  const db = getDb();
  const [invite] = await db
    .select()
    .from(schema.podInvites)
    .where(eq(schema.podInvites.token, token))
    .limit(1);

  if (!invite || invite.status !== 'pending' || invite.expiresAt < new Date()) {
    return null;
  }

  const [podRow] = await db
    .select({ externalId: schema.pods.externalId })
    .from(schema.pods)
    .where(eq(schema.pods.id, invite.podId))
    .limit(1);

  if (!podRow) return null;

  await addPodMember(podRow.externalId, clerkUserId, 'member');
  await db
    .update(schema.podInvites)
    .set({ status: 'accepted', invitedClerkId: clerkUserId })
    .where(eq(schema.podInvites.id, invite.id));

  return podRow.externalId;
}

export async function createPodShare(params: {
  shareId: string;
  externalPodId: string;
  ownerClerkId?: string;
  access: 'public' | 'invite';
  expiresAt?: Date;
}) {
  const podUuid = await getPodUuid(params.externalPodId);
  if (!podUuid) return null;
  const db = getDb();
  const [row] = await db
    .insert(schema.podShares)
    .values({
      shareId: params.shareId,
      podId: podUuid,
      ownerClerkId: params.ownerClerkId ?? null,
      access: params.access,
      expiresAt: params.expiresAt ?? null,
    })
    .returning();
  return row;
}

export async function findPodShare(shareId: string) {
  const db = getDb();
  const [row] = await db
    .select({
      share: schema.podShares,
      externalPodId: schema.pods.externalId,
    })
    .from(schema.podShares)
    .innerJoin(schema.pods, eq(schema.podShares.podId, schema.pods.id))
    .where(eq(schema.podShares.shareId, shareId))
    .limit(1);
  return row ?? null;
}

export async function joinPodByShare(
  shareId: string,
  clerkUserId: string
): Promise<{ externalPodId: string } | null> {
  const share = await findPodShare(shareId);
  if (!share) return null;
  if (share.share.expiresAt && share.share.expiresAt < new Date()) return null;

  await addPodMember(share.externalPodId, clerkUserId);
  return { externalPodId: share.externalPodId };
}
