import { NextRequest, NextResponse } from 'next/server'
import { requireHrAccess } from '@/lib/hr-auth'
import { getCourseById } from '@/lib/db/course-repository'
import { createCourseInviteToken } from '@/lib/course-invites'

export async function POST(request: NextRequest, { params }: { params: Promise<{ courseId: string }> }) {
  try {
    const ctx = await requireHrAccess()
    const { courseId } = await params
    const course = await getCourseById(courseId, ctx.orgSlug)
    if (!course) return NextResponse.json({ error: 'Course not found' }, { status: 404 })

    const token = createCourseInviteToken({
      courseId: course.id,
      orgSlug: ctx.orgSlug,
      invitedByClerkId: ctx.clerkUserId,
    })
    const origin = process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin
    return NextResponse.json({ success: true, shareUrl: `${origin}/course-invite/${encodeURIComponent(token)}` })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to create invitation'
    return NextResponse.json({ error: message }, { status: message.includes('access') ? 403 : 500 })
  }
}
