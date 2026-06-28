import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { requireAurora } from '@/lib/db/require-aurora';
import {
  listLearnerCompetencies,
  getOrCreatePublicSlug,
} from '@/lib/db/competency-repository';

export async function GET() {
  try {
    const authUser = await requireAuth();
    requireAurora('Competencies');

    const competencies = await listLearnerCompetencies(authUser.id);
    const publicSlug = await getOrCreatePublicSlug(authUser.id, authUser.email);

    return NextResponse.json({
      success: true,
      competencies: competencies.map((c) => ({
        id: c.id,
        name: c.name,
        level: c.level,
        progress: c.progress,
        evidence: c.evidence.join(' · '),
        sourceVideoId: c.sourceVideoId,
      })),
      publicSlug,
    });
  } catch (error) {
    console.error('Competencies GET error:', error);
    return NextResponse.json({ success: false, error: 'Failed to load competencies' }, { status: 500 });
  }
}
