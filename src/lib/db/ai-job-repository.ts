import { eq } from 'drizzle-orm';
import { aiJobs } from '@chatpye/database';
import type { AiCapability, AiProviderId, AiResult, SourceReference } from '@chatpye/ai-core';
import { getDb, isDatabaseConfigured } from '@/lib/db';
import { logger } from '@/lib/logger';

export type PersistAiJobInput = {
  capability: AiCapability;
  organisationId?: string | null;
  userId?: string | null;
  resourceId?: string | null;
  inputRef?: Record<string, unknown>;
};

export async function createAiJobRecord(input: PersistAiJobInput): Promise<string | null> {
  if (!isDatabaseConfigured()) return null;

  try {
    const db = getDb();
    const [row] = await db
      .insert(aiJobs)
      .values({
        capability: input.capability,
        organisationId: input.organisationId ?? null,
        userId: input.userId ?? null,
        resourceId: input.resourceId ?? null,
        provider: 'pending',
        model: 'pending',
        promptVersion: 'pending',
        status: 'running',
        inputRef: input.inputRef ?? {},
        attempt: 1,
      })
      .returning({ id: aiJobs.id });

    return row?.id ?? null;
  } catch (error) {
    logger.warn('Failed to create ai_jobs record', {
      capability: input.capability,
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}

export async function finalizeAiJobRecord(
  jobId: string | null,
  result: AiResult<unknown>,
): Promise<void> {
  if (!jobId || !isDatabaseConfigured()) return;

  try {
    const db = getDb();
    if (result.ok) {
      await db
        .update(aiJobs)
        .set({
          status: 'completed',
          provider: result.provider,
          model: result.model,
          promptVersion: result.promptVersion,
          sourceReferences: result.sourceReferences,
          inputTokens: result.usage.inputTokens ?? null,
          outputTokens: result.usage.outputTokens ?? null,
          estimatedCostUsd:
            result.usage.estimatedCostUsd != null
              ? String(result.usage.estimatedCostUsd)
              : null,
          latencyMs: result.usage.latencyMs,
          completedAt: new Date(),
        })
        .where(eq(aiJobs.id, jobId));
      return;
    }

    await db
      .update(aiJobs)
      .set({
        status: result.retryable ? 'failed' : 'dead_letter',
        provider: result.provider ?? 'unknown',
        model: 'n/a',
        promptVersion: 'n/a',
        errorCode: result.code,
        latencyMs: 0,
        completedAt: new Date(),
      })
      .where(eq(aiJobs.id, jobId));
  } catch (error) {
    logger.warn('Failed to finalize ai_jobs record', {
      jobId,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

export async function persistRoutedAiCall<T>(
  input: PersistAiJobInput,
  invoke: () => Promise<AiResult<T>>,
): Promise<AiResult<T>> {
  const jobId = await createAiJobRecord(input);
  const result = await invoke();
  await finalizeAiJobRecord(jobId, result);
  return result;
}

export type { SourceReference, AiProviderId };
