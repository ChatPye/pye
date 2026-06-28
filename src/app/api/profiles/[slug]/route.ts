import { NextResponse } from 'next/server';
import { getPublicProfileBySlug } from '@/lib/db/competency-repository';

export type PublicProfile = {
  slug: string;
  name: string;
  title: string;
  headline: string;
  competencies: Array<{ name: string; level: string; evidence: string }>;
  certificates: Array<{ title: string; issuedAt: string }>;
  stats: { coursesCompleted: number; hoursLearned: number; chatSessions: number };
};

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
};

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  if (slug === 'demo') {
    return NextResponse.json(DEMO_PROFILE);
  }

  try {
    const profile = await getPublicProfileBySlug(slug);
    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }
    return NextResponse.json(profile);
  } catch {
    return NextResponse.json({ error: 'Failed to load profile' }, { status: 500 });
  }
}
