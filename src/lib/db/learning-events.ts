import { getDb, isDatabaseConfigured, schema } from '@/lib/db'
import { eq } from 'drizzle-orm'
import { logger } from '@/lib/logger'

export type LearningEventType =
  | 'video.uploaded'
  | 'video.processing_started'
  | 'video.processing_complete'
  | 'video.processing_failed'
  | 'chat.message'
  | 'course.created'
  | 'course.assigned'
  | 'course.invite_accepted'
  | 'course.invite_declined'
  | 'skillproof.step_completed'
  | 'skillproof.evidence_submitted'
  | 'skillproof.reflection_submitted'
  | 'skillproof.snip_saved'
  | 'skillproof.timestamp_clip_saved'
  | 'skillproof.quiz_completed'
  | 'skillproof.flashcards_reviewed'
  | 'skillproof.repo_assessed'
  | 'video.viewed'

export async function recordLearningEvent(input: {
  ownerClerkId: string
  type: LearningEventType
  externalVideoId?: string
  payload?: Record<string, unknown>
}): Promise<void> {
  if (!isDatabaseConfigured() || process.env.DEV_FORCE_IN_MEMORY === 'true') {
    logger.debug('Learning event (dev)', {
      type: input.type,
      ownerClerkId: input.ownerClerkId,
      externalVideoId: input.externalVideoId,
    })
    return
  }

  try {
    const db = getDb()
    let videoUuid: string | null = null

    if (input.externalVideoId) {
      const [video] = await db
        .select({ id: schema.videos.id })
        .from(schema.videos)
        .where(eq(schema.videos.externalId, input.externalVideoId))
        .limit(1)
      videoUuid = video?.id ?? null
    }

    await db.insert(schema.learningEvents).values({
      ownerClerkId: input.ownerClerkId,
      videoId: videoUuid,
      type: input.type,
      payload: {
        externalVideoId: input.externalVideoId,
        ...input.payload,
      },
    })
  } catch (error) {
    logger.warn('Failed to record learning event', {
      type: input.type,
      error: error instanceof Error ? error.message : String(error),
    })
  }
}
