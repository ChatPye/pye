import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { requireAurora } from '@/lib/db/require-aurora';
import { analyzeVideoCompetencies } from '@/lib/db/competency-repository';

export const maxDuration = 60;

export async function POST(request: NextRequest) {
  try {
    const authUser = await requireAuth();
    requireAurora('Competency analysis');

    const body = await request.json();
    const videoId = typeof body.videoId === 'string' ? body.videoId.trim() : '';
    if (!videoId) {
      return NextResponse.json({ success: false, error: 'videoId required' }, { status: 400 });
    }

    const competencies = await analyzeVideoCompetencies({
      ownerClerkId: authUser.id,
      externalVideoId: videoId,
      displayName: authUser.email,
    });

    return NextResponse.json({ success: true, competencies });
  } catch (error) {
    console.error('Competency analyze error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Analysis failed' },
      { status: 500 }
    );
  }
}
