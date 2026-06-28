import { desc, eq, inArray, or, sql } from 'drizzle-orm'
import { getDb, isDatabaseConfigured, schema } from '@/lib/db'
import {
  getOrCreateOrganization,
  getOrCreateUserByClerk,
  findUserByClerkId,
  findUserByEmail,
} from '@/lib/db/org-repository'
import {
  memoryAssignCourse,
  memoryCreateCourse,
  memoryGetCourse,
  memoryListAssignedForUser,
  memoryListCourses,
  memoryListEnrollmentsForOrg,
  type CourseRecord,
  type EnrollmentRecord,
} from '@/data/stores/courseMemoryStore'
import type { OrgRole } from '@/lib/hr-auth'

export type { CourseRecord, EnrollmentRecord }

async function resolveOrg(orgSlug: string) {
  const org = await getOrCreateOrganization(orgSlug)
  if (org) return org
  return { id: orgSlug, slug: orgSlug, name: orgSlug }
}

export async function listOrgCourses(orgSlug: string): Promise<CourseRecord[]> {
  if (!isDatabaseConfigured()) {
    return memoryListCourses(orgSlug)
  }

  const org = await resolveOrg(orgSlug)
  const db = getDb()
  const rows = await db
    .select()
    .from(schema.courses)
    .where(eq(schema.courses.orgId, org.id))
    .orderBy(desc(schema.courses.createdAt))

  const courseIds = rows.map((r) => r.id)
  let enrollmentCounts: Record<string, number> = {}

  if (courseIds.length > 0) {
    const counts = await db
      .select({
        courseId: schema.courseEnrollments.courseId,
        count: sql<number>`count(*)::int`,
      })
      .from(schema.courseEnrollments)
      .where(inArray(schema.courseEnrollments.courseId, courseIds))
      .groupBy(schema.courseEnrollments.courseId)

    enrollmentCounts = Object.fromEntries(counts.map((c) => [c.courseId, c.count]))
  }

  return rows.map((row) => ({
    id: row.id,
    orgId: row.orgId,
    title: row.title,
    description: row.description ?? undefined,
    thumbnailUrl: row.thumbnailUrl ?? undefined,
    published: row.published,
    providerName: row.providerName ?? undefined,
    enrollmentCount: enrollmentCounts[row.id] ?? 0,
    createdAt: row.createdAt.toISOString(),
  }))
}

export async function createOrgCourse(
  orgSlug: string,
  input: { title: string; description?: string; published?: boolean },
  creator: { clerkUserId: string; email: string; name: string; role: OrgRole }
): Promise<CourseRecord> {
  if (!isDatabaseConfigured()) {
    return memoryCreateCourse(orgSlug, input)
  }

  const org = await getOrCreateOrganization(orgSlug)
  if (!org) throw new Error('Organization not available')

  await getOrCreateUserByClerk({
    clerkUserId: creator.clerkUserId,
    email: creator.email,
    name: creator.name,
    orgId: org.id,
    role: creator.role,
  })

  const db = getDb()
  const [row] = await db
    .insert(schema.courses)
    .values({
      orgId: org.id,
      title: input.title,
      description: input.description ?? null,
      published: input.published ?? false,
    })
    .returning()

  return {
    id: row.id,
    orgId: row.orgId,
    title: row.title,
    description: row.description ?? undefined,
    published: row.published,
    enrollmentCount: 0,
    createdAt: row.createdAt.toISOString(),
  }
}

export async function getCourseById(
  courseId: string,
  orgSlug?: string
): Promise<CourseRecord | null> {
  if (!isDatabaseConfigured()) {
    const course = memoryGetCourse(courseId)
    if (!course) return null
    if (orgSlug && course.orgId !== orgSlug) return null
    return course
  }

  const db = getDb()
  const [row] = await db
    .select()
    .from(schema.courses)
    .where(eq(schema.courses.id, courseId))
    .limit(1)

  if (!row) return null

  if (orgSlug) {
    const org = await resolveOrg(orgSlug)
    if (row.orgId !== org.id) return null
  }

  return {
    id: row.id,
    orgId: row.orgId,
    title: row.title,
    description: row.description ?? undefined,
    thumbnailUrl: row.thumbnailUrl ?? undefined,
    published: row.published,
    providerName: row.providerName ?? undefined,
    createdAt: row.createdAt.toISOString(),
  }
}

export async function assignCourse(input: {
  courseId: string
  orgSlug: string
  assignedByClerkId: string
  assignees: Array<{ clerkUserId?: string; email?: string; name?: string }>
}): Promise<EnrollmentRecord[]> {
  const course = await getCourseById(input.courseId, input.orgSlug)
  if (!course) throw new Error('Course not found')

  const results: EnrollmentRecord[] = []

  for (const assignee of input.assignees) {
    if (!isDatabaseConfigured()) {
      results.push(
        memoryAssignCourse({
          courseId: course.id,
          courseTitle: course.title,
          assigneeClerkId: assignee.clerkUserId,
          assigneeEmail: assignee.email,
          assigneeName: assignee.name,
          assignedByClerkId: input.assignedByClerkId,
        })
      )
      continue
    }

    const db = getDb()
    let userId: string | null = null

    if (assignee.clerkUserId) {
      const user = await findUserByClerkId(assignee.clerkUserId)
      userId = user?.id ?? null
    } else if (assignee.email) {
      const user = await findUserByEmail(assignee.email)
      userId = user?.id ?? null
    }

    const [row] = await db
      .insert(schema.courseEnrollments)
      .values({
        courseId: course.id,
        userId,
        assigneeClerkId: assignee.clerkUserId ?? null,
        assigneeEmail: assignee.email?.toLowerCase() ?? null,
        assigneeName: assignee.name ?? null,
        assignedByClerkId: input.assignedByClerkId,
        status: 'assigned',
        progressPercent: 0,
      })
      .returning()

    results.push({
      id: row.id,
      courseId: course.id,
      courseTitle: course.title,
      assigneeClerkId: row.assigneeClerkId ?? undefined,
      assigneeEmail: row.assigneeEmail ?? undefined,
      assigneeName: row.assigneeName ?? undefined,
      assignedByClerkId: row.assignedByClerkId ?? undefined,
      status: row.status,
      progressPercent: row.progressPercent,
      enrolledAt: row.enrolledAt.toISOString(),
      completedAt: row.completedAt?.toISOString(),
    })
  }

  return results
}

export async function listAssignedCourses(
  clerkUserId: string,
  email?: string
): Promise<EnrollmentRecord[]> {
  if (!isDatabaseConfigured()) {
    return memoryListAssignedForUser(clerkUserId, email)
  }

  const db = getDb()
  const conditions = [eq(schema.courseEnrollments.assigneeClerkId, clerkUserId)]
  if (email) {
    conditions.push(eq(schema.courseEnrollments.assigneeEmail, email.toLowerCase()))
  }

  const rows = await db
    .select({
      enrollment: schema.courseEnrollments,
      courseTitle: schema.courses.title,
    })
    .from(schema.courseEnrollments)
    .innerJoin(schema.courses, eq(schema.courseEnrollments.courseId, schema.courses.id))
    .where(or(...conditions))
    .orderBy(desc(schema.courseEnrollments.enrolledAt))

  return rows.map(({ enrollment, courseTitle }) => ({
    id: enrollment.id,
    courseId: enrollment.courseId,
    courseTitle,
    assigneeClerkId: enrollment.assigneeClerkId ?? undefined,
    assigneeEmail: enrollment.assigneeEmail ?? undefined,
    assigneeName: enrollment.assigneeName ?? undefined,
    assignedByClerkId: enrollment.assignedByClerkId ?? undefined,
    status: enrollment.status,
    progressPercent: enrollment.progressPercent,
    enrolledAt: enrollment.enrolledAt.toISOString(),
    completedAt: enrollment.completedAt?.toISOString(),
  }))
}

export async function listOrgEnrollments(orgSlug: string): Promise<EnrollmentRecord[]> {
  if (!isDatabaseConfigured()) {
    return memoryListEnrollmentsForOrg(orgSlug)
  }

  const org = await resolveOrg(orgSlug)
  const db = getDb()

  const rows = await db
    .select({
      enrollment: schema.courseEnrollments,
      courseTitle: schema.courses.title,
    })
    .from(schema.courseEnrollments)
    .innerJoin(schema.courses, eq(schema.courseEnrollments.courseId, schema.courses.id))
    .where(eq(schema.courses.orgId, org.id))
    .orderBy(desc(schema.courseEnrollments.enrolledAt))

  return rows.map(({ enrollment, courseTitle }) => ({
    id: enrollment.id,
    courseId: enrollment.courseId,
    courseTitle,
    assigneeClerkId: enrollment.assigneeClerkId ?? undefined,
    assigneeEmail: enrollment.assigneeEmail ?? undefined,
    assigneeName: enrollment.assigneeName ?? undefined,
    assignedByClerkId: enrollment.assignedByClerkId ?? undefined,
    status: enrollment.status,
    progressPercent: enrollment.progressPercent,
    enrolledAt: enrollment.enrolledAt.toISOString(),
    completedAt: enrollment.completedAt?.toISOString(),
  }))
}

export type HrDashboardData = {
  orgSlug: string
  stats: {
    totalCourses: number
    publishedCourses: number
    activeEnrollments: number
    completedEnrollments: number
    avgProgress: number
  }
  courses: CourseRecord[]
  enrollments: EnrollmentRecord[]
  recentActivity: Array<{
    id: string
    type: string
    ownerClerkId?: string
    createdAt: string
    payload: Record<string, unknown>
  }>
  teamProgress: Array<{
    assigneeClerkId?: string
    assigneeEmail?: string
    assigneeName?: string
    coursesAssigned: number
    coursesCompleted: number
    avgProgress: number
  }>
}

export async function getHrDashboard(orgSlug: string): Promise<HrDashboardData> {
  const courses = await listOrgCourses(orgSlug)
  const enrollments = await listOrgEnrollments(orgSlug)

  const activeEnrollments = enrollments.filter((e) => e.status !== 'completed').length
  const completedEnrollments = enrollments.filter((e) => e.status === 'completed').length
  const avgProgress =
    enrollments.length > 0
      ? Math.round(
          enrollments.reduce((sum, e) => sum + e.progressPercent, 0) / enrollments.length
        )
      : 0

  const teamMap = new Map<
    string,
    {
      assigneeClerkId?: string
      assigneeEmail?: string
      assigneeName?: string
      assigned: number
      completed: number
      progressSum: number
    }
  >()

  for (const e of enrollments) {
    const key = e.assigneeClerkId || e.assigneeEmail || e.id
    const entry = teamMap.get(key) ?? {
      assigneeClerkId: e.assigneeClerkId,
      assigneeEmail: e.assigneeEmail,
      assigneeName: e.assigneeName,
      assigned: 0,
      completed: 0,
      progressSum: 0,
    }
    entry.assigned += 1
    if (e.status === 'completed') entry.completed += 1
    entry.progressSum += e.progressPercent
    teamMap.set(key, entry)
  }

  const teamProgress = Array.from(teamMap.values()).map((t) => ({
    assigneeClerkId: t.assigneeClerkId,
    assigneeEmail: t.assigneeEmail,
    assigneeName: t.assigneeName,
    coursesAssigned: t.assigned,
    coursesCompleted: t.completed,
    avgProgress: t.assigned > 0 ? Math.round(t.progressSum / t.assigned) : 0,
  }))

  let recentActivity: HrDashboardData['recentActivity'] = []

  if (isDatabaseConfigured()) {
    try {
      const org = await resolveOrg(orgSlug)
      const db = getDb()
      const orgUsers = await db
        .select({ clerkUserId: schema.users.clerkUserId })
        .from(schema.users)
        .where(eq(schema.users.orgId, org.id))

      const clerkIds = orgUsers.map((u) => u.clerkUserId).filter(Boolean) as string[]

      if (clerkIds.length > 0) {
        const events = await db
          .select()
          .from(schema.learningEvents)
          .where(inArray(schema.learningEvents.ownerClerkId, clerkIds))
          .orderBy(desc(schema.learningEvents.createdAt))
          .limit(20)

        recentActivity = events.map((ev) => ({
          id: ev.id,
          type: ev.type,
          ownerClerkId: ev.ownerClerkId ?? undefined,
          createdAt: ev.createdAt.toISOString(),
          payload: (ev.payload as Record<string, unknown>) ?? {},
        }))
      }
    } catch {
      recentActivity = []
    }
  }

  return {
    orgSlug,
    stats: {
      totalCourses: courses.length,
      publishedCourses: courses.filter((c) => c.published).length,
      activeEnrollments,
      completedEnrollments,
      avgProgress,
    },
    courses,
    enrollments,
    recentActivity,
    teamProgress,
  }
}
