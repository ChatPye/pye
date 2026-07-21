import jwt from 'jsonwebtoken'

export type CourseInvite = {
  courseId: string
  orgSlug: string
  invitedByClerkId: string
}

function secret() {
  const value = process.env.COURSE_INVITE_SECRET
  if (!value && process.env.NODE_ENV === 'production') {
    throw new Error('Course sharing is not configured')
  }
  return value || 'chatpye-development-course-invite-secret'
}

export function createCourseInviteToken(invite: CourseInvite) {
  return jwt.sign(invite, secret(), { expiresIn: '14d', audience: 'course-invite' })
}

export function verifyCourseInviteToken(token: string): CourseInvite {
  const value = jwt.verify(token, secret(), { audience: 'course-invite' })
  if (!value || typeof value !== 'object') throw new Error('Invalid invitation')
  const invite = value as Partial<CourseInvite>
  if (!invite.courseId || !invite.orgSlug || !invite.invitedByClerkId) throw new Error('Invalid invitation')
  return {
    courseId: invite.courseId,
    orgSlug: invite.orgSlug,
    invitedByClerkId: invite.invitedByClerkId,
  }
}
