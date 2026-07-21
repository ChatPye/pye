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
    const message = error instanceof Error ? error.message : 'Analysis failed';
    const throttled = /ThrottlingException|too many tokens|rate.?limit/i.test(message);
    if (throttled) {
      // Competency assertions must never make learning unavailable. The manager
      // still receives the learner's submitted evidence; AI review can resume
      // when the configured model capacity is available.
      return NextResponse.json(
        {
          success: true,
          competencies: [],
          analysisStatus: 'deferred',
          message: 'AI competency review is temporarily at capacity. Learning evidence has been saved for later review.',
        },
        { status: 202 }
      );
    }
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
