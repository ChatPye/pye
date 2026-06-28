export type CourseRecord = {
  id: string
  orgId: string
  title: string
  description?: string
  thumbnailUrl?: string
  published: boolean
  providerName?: string
  moduleCount?: number
  enrollmentCount?: number
  createdAt: string
}

export type EnrollmentRecord = {
  id: string
  courseId: string
  courseTitle: string
  assigneeClerkId?: string
  assigneeEmail?: string
  assigneeName?: string
  assignedByClerkId?: string
  status: string
  progressPercent: number
  enrolledAt: string
  completedAt?: string
}

type MemoryState = {
  courses: CourseRecord[]
  enrollments: EnrollmentRecord[]
}

declare global {
  // eslint-disable-next-line no-var
  var __CHATPYE_COURSE_STORE__: MemoryState | undefined
}

function store(): MemoryState {
  if (!global.__CHATPYE_COURSE_STORE__) {
    global.__CHATPYE_COURSE_STORE__ = { courses: [], enrollments: [] }
  }
  return global.__CHATPYE_COURSE_STORE__!
}

export function memoryListCourses(orgId: string): CourseRecord[] {
  return store().courses.filter((c) => c.orgId === orgId)
}

export function memoryCreateCourse(
  orgId: string,
  input: { title: string; description?: string; published?: boolean }
): CourseRecord {
  const course: CourseRecord = {
    id: `course_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    orgId,
    title: input.title,
    description: input.description,
    published: input.published ?? false,
    enrollmentCount: 0,
    moduleCount: 0,
    createdAt: new Date().toISOString(),
  }
  store().courses.push(course)
  return course
}

export function memoryAssignCourse(input: {
  courseId: string
  courseTitle: string
  assigneeClerkId?: string
  assigneeEmail?: string
  assigneeName?: string
  assignedByClerkId: string
}): EnrollmentRecord {
  const enrollment: EnrollmentRecord = {
    id: `enr_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    courseId: input.courseId,
    courseTitle: input.courseTitle,
    assigneeClerkId: input.assigneeClerkId,
    assigneeEmail: input.assigneeEmail,
    assigneeName: input.assigneeName,
    assignedByClerkId: input.assignedByClerkId,
    status: 'assigned',
    progressPercent: 0,
    enrolledAt: new Date().toISOString(),
  }
  store().enrollments.push(enrollment)
  const course = store().courses.find((c) => c.id === input.courseId)
  if (course) {
    course.enrollmentCount = store().enrollments.filter((e) => e.courseId === input.courseId).length
  }
  return enrollment
}

export function memoryListEnrollmentsForOrg(orgId: string): EnrollmentRecord[] {
  const courseIds = new Set(store().courses.filter((c) => c.orgId === orgId).map((c) => c.id))
  return store().enrollments.filter((e) => courseIds.has(e.courseId))
}

export function memoryListAssignedForUser(clerkUserId: string, email?: string): EnrollmentRecord[] {
  return store().enrollments.filter(
    (e) =>
      e.assigneeClerkId === clerkUserId ||
      (email && e.assigneeEmail?.toLowerCase() === email.toLowerCase())
  )
}

export function memoryGetCourse(courseId: string): CourseRecord | null {
  return store().courses.find((c) => c.id === courseId) ?? null
}
