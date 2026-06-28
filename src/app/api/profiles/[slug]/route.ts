import { NextResponse } from 'next/server'
import { isDatabaseConfigured, getDb, schema } from '@/lib/db'
import { eq } from 'drizzle-orm'

export type PublicProfile = {
  slug: string
  name: string
  title: string
  headline: string
  competencies: Array<{ name: string; level: string; evidence: string }>
  certificates: Array<{ title: string; issuedAt: string }>
  stats: { coursesCompleted: number; hoursLearned: number; chatSessions: number }
}

const DEMO_PROFILE: PublicProfile = {
  slug: 'demo',
  name: 'Alex Kim',
  title: 'Software Engineer',
  headline: 'Completed 3 courses · 12 verified competencies',
  competencies: [
    { name: 'React & TypeScript', level: 'Proficient', evidence: 'Built interactive dashboard from training video' },
    { name: 'AWS Fundamentals', level: 'Foundational', evidence: 'Passed cloud architecture module with AI tutor' },
    { name: 'Data Analysis', level: 'Intermediate', evidence: 'Extracted and applied code patterns from 4 videos' },
  ],
  certificates: [
    { title: 'Full-Stack Development Path', issuedAt: '2026-05-12' },
    { title: 'Cloud Essentials', issuedAt: '2026-04-03' },
  ],
  stats: { coursesCompleted: 3, hoursLearned: 24, chatSessions: 47 },
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params

  if (slug === 'demo') {
    return NextResponse.json(DEMO_PROFILE)
  }

  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
  }

  try {
    const db = getDb()
    const [cert] = await db
      .select()
      .from(schema.certificates)
      .where(eq(schema.certificates.publicSlug, slug))
      .limit(1)

    if (!cert) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    const [user] = await db
      .select()
      .from(schema.users)
      .where(eq(schema.users.id, cert.userId))
      .limit(1)

    const userAssertions = await db
      .select({
        level: schema.assertions.level,
        competencyName: schema.competencies.name,
        evidence: schema.assertions.evidence,
      })
      .from(schema.assertions)
      .innerJoin(schema.competencies, eq(schema.assertions.competencyId, schema.competencies.id))
      .where(eq(schema.assertions.userId, cert.userId))

    const profile: PublicProfile = {
      slug,
      name: user?.name ?? 'Learner',
      title: user?.role ?? 'employee',
      headline: cert.title,
      competencies: userAssertions.map((a) => ({
        name: a.competencyName,
        level: `Level ${a.level}`,
        evidence: (a.evidence as string[])?.[0] ?? 'Verified through ChatPye learning',
      })),
      certificates: [{ title: cert.title, issuedAt: cert.issuedAt.toISOString().slice(0, 10) }],
      stats: { coursesCompleted: 1, hoursLearned: 0, chatSessions: 0 },
    }

    return NextResponse.json(profile)
  } catch {
    return NextResponse.json({ error: 'Failed to load profile' }, { status: 500 })
  }
}
