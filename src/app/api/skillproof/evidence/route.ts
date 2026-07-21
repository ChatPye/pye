import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { recordLearningEvent, type LearningEventType } from '@/lib/db/learning-events'

const allowedActions: LearningEventType[] = [
  'skillproof.step_completed',
  'skillproof.evidence_submitted',
  'skillproof.reflection_submitted',
]

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth()
    const body = await request.json() as Record<string, unknown>
    const videoId = typeof body.videoId === 'string' ? body.videoId.trim() : ''
    const action = typeof body.action === 'string' ? body.action as LearningEventType : null
    const workspace = body.workspace === 'excel' ? 'excel' : body.workspace === 'vscode' ? 'vscode' : body.workspace === 'general' ? 'general' : null

    if (!videoId || !workspace || !action || !allowedActions.includes(action)) {
      return NextResponse.json({ success: false, error: 'videoId, workspace and a valid action are required' }, { status: 400 })
    }

    const payload: Record<string, unknown> = { workspace }
    if (typeof body.stepIndex === 'number') payload.stepIndex = body.stepIndex
    if (typeof body.stepTitle === 'string') payload.stepTitle = body.stepTitle.slice(0, 200)
    if (typeof body.expectedEvidence === 'string') payload.expectedEvidence = body.expectedEvidence.slice(0, 500)
    if (typeof body.evidenceUrl === 'string') payload.evidenceUrl = body.evidenceUrl.slice(0, 2000)
    if (typeof body.reflection === 'string') payload.reflection = body.reflection.slice(0, 2000)

    await recordLearningEvent({ ownerClerkId: user.id, type: action, externalVideoId: videoId, payload })
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : 'Unable to save evidence' }, { status: 500 })
  }
}
