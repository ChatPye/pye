import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { recordLearningEvent, type LearningEventType } from '@/lib/db/learning-events'

const allowedActions: LearningEventType[] = [
  'skillproof.step_completed',
  'skillproof.evidence_submitted',
  'skillproof.reflection_submitted',
  'skillproof.quiz_completed',
  'skillproof.flashcards_reviewed',
  'skillproof.repo_assessed',
  'video.viewed',
]

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth()
    const body = await request.json() as Record<string, unknown>
    const videoId = typeof body.videoId === 'string' ? body.videoId.trim() : ''
    const action = typeof body.action === 'string' ? body.action as LearningEventType : null
    const workspace = body.workspace === 'excel' ? 'excel' : body.workspace === 'vscode' ? 'vscode' : body.workspace === 'general' ? 'general' : null

    if (!videoId || !action || !allowedActions.includes(action)) {
      return NextResponse.json({ success: false, error: 'videoId, workspace and a valid action are required' }, { status: 400 })
    }

    const payload: Record<string, unknown> = { workspace: workspace ?? 'general' }
    if (typeof body.stepIndex === 'number') payload.stepIndex = body.stepIndex
    if (typeof body.stepTitle === 'string') payload.stepTitle = body.stepTitle.slice(0, 200)
    if (typeof body.expectedEvidence === 'string') payload.expectedEvidence = body.expectedEvidence.slice(0, 500)
    if (typeof body.evidenceUrl === 'string') payload.evidenceUrl = body.evidenceUrl.slice(0, 2000)
    if (typeof body.reflection === 'string') payload.reflection = body.reflection.slice(0, 2000)
    if (typeof body.score === 'number') payload.score = body.score
    if (typeof body.total === 'number') payload.total = body.total
    if (Array.isArray(body.answers)) payload.answers = body.answers.slice(0, 20)
    if (typeof body.repoUrl === 'string') payload.repoUrl = body.repoUrl.slice(0, 2000)
    if (typeof body.assessment === 'object' && body.assessment) payload.assessment = body.assessment

    await recordLearningEvent({ ownerClerkId: user.id, type: action, externalVideoId: videoId, payload })
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : 'Unable to save evidence' }, { status: 500 })
  }
}
