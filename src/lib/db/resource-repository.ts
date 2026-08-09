import { and, eq, isNull } from 'drizzle-orm';
import { resources, resourceProcessingJobs } from '@chatpye/database';
import type {
  ResourceProcessingState,
  ResourceRecord,
  ResourceSourceType,
  ResourceVisibility,
} from '@/lib/resources/types';
import {
  assertResourceTransition,
  canTransitionResourceState,
} from '@/lib/resources/state-machine';
import { getDb, isDatabaseConfigured } from '@/lib/db';

type DbResourceRow = typeof resources.$inferSelect;
type DbProcessingJobRow = typeof resourceProcessingJobs.$inferSelect;

function mapResourceRow(row: DbResourceRow): ResourceRecord {
  return {
    id: row.id,
    ownerUserId: row.ownerUserId,
    organisationId: row.organisationId,
    sourceType: row.sourceType as ResourceSourceType,
    sourceRef: row.sourceRef,
    title: row.title,
    description: row.description,
    displayMetadata: (row.displayMetadata ?? {}) as Record<string, unknown>,
    processingState: row.processingState as ResourceProcessingState,
    visibility: row.visibility as ResourceVisibility,
    failureCode: row.failureCode,
    failureMessage: row.failureMessage,
    artefact: row.artefact as Record<string, unknown> | null,
    legacyExternalId: row.legacyExternalId,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export async function createResource(input: {
  ownerUserId: string;
  organisationId?: string | null;
  sourceType: ResourceSourceType;
  sourceRef: string;
  title: string;
  description?: string | null;
  displayMetadata?: Record<string, unknown>;
  visibility?: ResourceVisibility;
  legacyExternalId?: string | null;
}): Promise<ResourceRecord> {
  const db = getDb();
  const [row] = await db
    .insert(resources)
    .values({
      ownerUserId: input.ownerUserId,
      organisationId: input.organisationId ?? null,
      sourceType: input.sourceType,
      sourceRef: input.sourceRef,
      title: input.title,
      description: input.description ?? null,
      displayMetadata: input.displayMetadata ?? {},
      processingState: 'created',
      visibility: input.visibility ?? 'private',
      legacyExternalId: input.legacyExternalId ?? null,
    })
    .returning();

  if (!row) throw new Error('Failed to create resource');
  return mapResourceRow(row);
}

export async function findResourceByOwnerAndSourceRef(
  ownerUserId: string,
  sourceRef: string,
): Promise<ResourceRecord | null> {
  if (!isDatabaseConfigured()) return null;
  const db = getDb();
  const [row] = await db
    .select()
    .from(resources)
    .where(
      and(
        eq(resources.ownerUserId, ownerUserId),
        eq(resources.sourceRef, sourceRef),
        isNull(resources.deletedAt),
      ),
    )
    .limit(1);
  return row ? mapResourceRow(row) : null;
}

export async function findResourceById(id: string): Promise<ResourceRecord | null> {
  if (!isDatabaseConfigured()) return null;
  const db = getDb();
  const [row] = await db
    .select()
    .from(resources)
    .where(and(eq(resources.id, id), isNull(resources.deletedAt)))
    .limit(1);
  return row ? mapResourceRow(row) : null;
}

export async function findResourceByLegacyExternalId(
  legacyExternalId: string,
): Promise<ResourceRecord | null> {
  if (!isDatabaseConfigured()) return null;
  const db = getDb();
  const [row] = await db
    .select()
    .from(resources)
    .where(and(eq(resources.legacyExternalId, legacyExternalId), isNull(resources.deletedAt)))
    .limit(1);
  return row ? mapResourceRow(row) : null;
}

export async function transitionResourceState(
  resourceId: string,
  to: ResourceProcessingState,
  patch?: Partial<{
    failureCode: string | null;
    failureMessage: string | null;
    artefact: Record<string, unknown> | null;
    title: string;
    description: string | null;
  }>,
): Promise<ResourceRecord> {
  const existing = await findResourceById(resourceId);
  if (!existing) throw new Error(`Resource not found: ${resourceId}`);

  assertResourceTransition(existing.processingState, to);

  const db = getDb();
  const [row] = await db
    .update(resources)
    .set({
      processingState: to,
      failureCode: patch?.failureCode,
      failureMessage: patch?.failureMessage,
      artefact: patch?.artefact,
      title: patch?.title,
      description: patch?.description,
      updatedAt: new Date(),
    })
    .where(eq(resources.id, resourceId))
    .returning();

  if (!row) throw new Error('Failed to update resource state');
  return mapResourceRow(row);
}

export async function createResourceProcessingJob(input: {
  resourceId: string;
  state?: ResourceProcessingState;
  provider?: string | null;
}): Promise<DbProcessingJobRow> {
  const db = getDb();
  const [row] = await db
    .insert(resourceProcessingJobs)
    .values({
      resourceId: input.resourceId,
      state: input.state ?? 'queued',
      provider: input.provider ?? null,
    })
    .returning();

  if (!row) throw new Error('Failed to create resource processing job');
  return row;
}

export async function updateResourceProcessingJob(
  jobId: string,
  patch: Partial<{
    state: ResourceProcessingState;
    attempt: number;
    provider: string | null;
    lastError: string | null;
    progressPercent: number;
    dlqRef: string | null;
  }>,
): Promise<void> {
  const db = getDb();
  await db
    .update(resourceProcessingJobs)
    .set({ ...patch, updatedAt: new Date() })
    .where(eq(resourceProcessingJobs.id, jobId));
}

export function canTransition(from: ResourceProcessingState, to: ResourceProcessingState): boolean {
  return canTransitionResourceState(from, to);
}

/** Map legacy video processing status strings to resource processing states. */
export function mapLegacyVideoProcessingStatus(status: string): ResourceProcessingState {
  switch (status) {
    case 'queued':
      return 'queued';
    case 'processing':
    case 'transcribing':
    case 'embedding':
      return 'analysing_content';
    case 'ready':
    case 'completed':
      return 'ready';
    case 'failed':
    case 'error':
      return 'failed';
    default:
      return 'processing_metadata';
  }
}
