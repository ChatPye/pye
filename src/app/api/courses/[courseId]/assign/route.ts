import { NextRequest, NextResponse } from 'next/server'
import { requireHrAccess } from '@/lib/hr-auth'
import { assignCourse } from '@/lib/db/course-repository'
import { recordLearningEvent } from '@/lib/db/learning-events'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ courseId: string }> }
) {
  try {
    const ctx = await requireHrAccess()
    const { courseId } = await params
    const body = await request.json()

    const { assigneeClerkIds, assignees, emails } = body as {
      assigneeClerkIds?: string[]
      assignees?: Array<{ clerkUserId?: string; email?: string; name?: string }>
      emails?: string[]
    }

    let resolvedAssignees: Array<{ clerkUserId?: string; email?: string; name?: string }> =
      assignees ?? []

    if (assigneeClerkIds?.length) {
      resolvedAssignees = [
        ...resolvedAssignees,
        ...assigneeClerkIds.map((id) => ({ clerkUserId: id })),
      ]
    }

    if (emails?.length) {
      resolvedAssignees = [
        ...resolvedAssignees,
        ...emails.map((email) => ({ email: email.trim() })),
      ]
    }

    if (resolvedAssignees.length === 0) {
      return NextResponse.json(
        { error: 'Provide assignees, assigneeClerkIds, or emails' },
        { status: 400 }
      )
    }

    const enrollments = await assignCourse({
      courseId,
      orgSlug: ctx.orgSlug,
      assignedByClerkId: ctx.clerkUserId,
      assignees: resolvedAssignees,
    })

    await recordLearningEvent({
      ownerClerkId: ctx.clerkUserId,
      type: 'course.assigned',
      payload: {
        courseId,
        count: enrollments.length,
      },
    })

    return NextResponse.json({ success: true, enrollments })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Assignment failed'
    const status = message.includes('access') || message.includes('required') ? 403 : 500
    return NextResponse.json({ error: message }, { status })
  }
}
