import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { findVideoByExternalId } from '@/lib/db/video-repository';
import { requireAurora } from '@/lib/db/require-aurora';
import { getDb, schema } from '@/lib/db';
import { generateGeminiFlashcards } from '@/lib/learning/gemini-study';
import { eq, and } from 'drizzle-orm';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authUser = await requireAuth();
    requireAurora('Flashcards');
    const { id: videoId } = await params;

    const db = getDb();
    const [row] = await db
      .select()
      .from(schema.videoFlashcards)
      .where(
        and(
          eq(schema.videoFlashcards.externalVideoId, videoId),
          eq(schema.videoFlashcards.ownerClerkId, authUser.id)
        )
      )
      .limit(1);

    if (!row) {
      return NextResponse.json({ success: true, cards: [], cached: false });
    }

    return NextResponse.json({
      success: true,
      cards: row.cards,
      cached: true,
      createdAt: row.createdAt,
    });
  } catch (error) {
    console.error('Flashcards GET error:', error);
    return NextResponse.json({ success: false, error: 'Failed to load flashcards' }, { status: 500 });
  }
}

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authUser = await requireAuth();
    requireAurora('Flashcards');
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
    const cards = await generateGeminiFlashcards(transcriptText, 8);

    const db = getDb();
    await db.insert(schema.videoFlashcards).values({
      externalVideoId: videoId,
      ownerClerkId: authUser.id,
      cards,
    });

    return NextResponse.json({ success: true, cards, cached: false });
  } catch (error) {
    console.error('Flashcards POST error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to generate flashcards' },
      { status: 500 }
    );
  }
}
