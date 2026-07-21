import { NextRequest, NextResponse } from 'next/server'
import { verifyCourseInviteToken } from '@/lib/course-invites'
import { assignCourse, getCourseById } from '@/lib/db/course-repository'
import { requireAuth } from '@/lib/auth'
import { recordLearningEvent } from '@/lib/db/learning-events'

async function resolve(token: string) {
  const invite = verifyCourseInviteToken(token)
  const course = await getCourseById(invite.courseId, invite.orgSlug)
  if (!course || !course.published) throw new Error('This learning invitation is unavailable')
  return { invite, course }
}

export async function GET(_request: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  try {
    const { token } = await params
    const { course } = await resolve(token)
    return NextResponse.json({ success: true, course: { title: course.title, description: course.description } })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Invalid invitation' }, { status: 404 })
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  try {
    const { token } = await params
    const body = await request.json().catch(() => ({})) as { decision?: string }
    const { invite, course } = await resolve(token)
    const user = await requireAuth()

    if (body.decision === 'decline') {
      await recordLearningEvent({ ownerClerkId: user.id, type: 'course.invite_declined', payload: { courseId: course.id } })
      return NextResponse.json({ success: true, status: 'declined' })
    }

    const [enrollment] = await assignCourse({
      courseId: course.id,
      orgSlug: invite.orgSlug,
      assignedByClerkId: invite.invitedByClerkId,
      assignees: [{ clerkUserId: user.id, email: user.email }],
    })
    await recordLearningEvent({ ownerClerkId: user.id, type: 'course.invite_accepted', payload: { courseId: course.id, enrollmentId: enrollment?.id } })
    return NextResponse.json({ success: true, status: 'accepted', enrollment })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to respond to invitation'
    return NextResponse.json({ error: message }, { status: message.includes('Authentication') ? 401 : 400 })
  }
}
