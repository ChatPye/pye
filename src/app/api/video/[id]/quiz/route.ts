import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { findVideoByExternalId } from '@/lib/db/video-repository';
import { requireAurora } from '@/lib/db/require-aurora';
import { getDb, schema } from '@/lib/db';
import { generateGeminiQuiz } from '@/lib/learning/gemini-study';
import { eq, and } from 'drizzle-orm';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authUser = await requireAuth();
    requireAurora('Quiz');
    const { id: videoId } = await params;

    const db = getDb();
    const [row] = await db
      .select()
      .from(schema.videoQuizzes)
      .where(
        and(
          eq(schema.videoQuizzes.externalVideoId, videoId),
          eq(schema.videoQuizzes.ownerClerkId, authUser.id)
        )
      )
      .limit(1);

    if (!row) {
      return NextResponse.json({ success: true, questions: [], cached: false });
    }

    return NextResponse.json({
      success: true,
      questions: row.questions,
      cached: true,
      createdAt: row.createdAt,
    });
  } catch (error) {
    console.error('Quiz GET error:', error);
    return NextResponse.json({ success: false, error: 'Failed to load quiz' }, { status: 500 });
  }
}

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authUser = await requireAuth();
    requireAurora('Quiz');
    const { id: videoId } = await params;

    const record = await findVideoByExternalId(videoId);
    if (!record) {
      return NextResponse.json({ success: false, error: 'Video not found' }, { status: 404 });
    }
    if (record.processingStatus !== 'complete') {
      return NextResponse.json(
        { success: false, error: 'Video still processing' },
        { status: 409 }
      );
    }

    const transcriptText = (record.transcript ?? []).map((s) => s.text).join(' ');
    const questions = await generateGeminiQuiz(transcriptText, 5);

    const db = getDb();
    await db.insert(schema.videoQuizzes).values({
      externalVideoId: videoId,
      ownerClerkId: authUser.id,
      questions,
    });

    return NextResponse.json({ success: true, questions, cached: false });
  } catch (error) {
    console.error('Quiz POST error:', error);
    return NextResponse.json({ success: false, error: 'Failed to generate quiz' }, { status: 500 });
  }
}
