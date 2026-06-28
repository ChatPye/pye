import { NextRequest, NextResponse } from 'next/server'
import { getOrgContext, isHrRole, requireHrAccess } from '@/lib/hr-auth'
import {
  createOrgCourse,
  listAssignedCourses,
  listOrgCourses,
} from '@/lib/db/course-repository'
import { recordLearningEvent } from '@/lib/db/learning-events'

export async function GET() {
  try {
    const ctx = await getOrgContext()
    if (!ctx) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (isHrRole(ctx.role)) {
      const courses = await listOrgCourses(ctx.orgSlug)
      return NextResponse.json({ success: true, courses, role: ctx.role })
    }

    const assigned = await listAssignedCourses(ctx.clerkUserId, ctx.user.email)
    return NextResponse.json({ success: true, assigned, role: ctx.role })
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const ctx = await requireHrAccess()
    const body = await request.json()
    const { title, description, published } = body as {
      title?: string
      description?: string
      published?: boolean
    }

    if (!title?.trim()) {
      return NextResponse.json({ error: 'title is required' }, { status: 400 })
    }

    const course = await createOrgCourse(
      ctx.orgSlug,
      { title: title.trim(), description, published: published ?? false },
      {
        clerkUserId: ctx.clerkUserId,
        email: ctx.user.email || `${ctx.clerkUserId}@chatpye.local`,
        name: ctx.user.email?.split('@')[0] || 'HR User',
        role: ctx.role,
      }
    )

    await recordLearningEvent({
      ownerClerkId: ctx.clerkUserId,
      type: 'course.created',
      payload: { courseId: course.id, title: course.title },
    })

    return NextResponse.json({ success: true, course })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create course'
    const status = message.includes('required') ? 403 : 500
    return NextResponse.json({ error: message }, { status })
  }
}
