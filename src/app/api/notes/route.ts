import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { getVideoNote, saveVideoNote } from '@/lib/db/notes-repository';

/** GET /api/notes?videoId=... — load saved note for a video */
export async function GET(request: NextRequest) {
  try {
    const authUser = await requireAuth();
    const videoId = request.nextUrl.searchParams.get('videoId')?.trim();

    if (!videoId) {
      return NextResponse.json({ success: false, error: 'videoId required' }, { status: 400 });
    }

    const note = await getVideoNote(authUser.id, videoId);
    return NextResponse.json({
      success: true,
      note: note
        ? { content: note.content, updatedAt: note.updatedAt.getTime() }
        : { content: '', updatedAt: null },
    });
  } catch (error) {
    console.error('Note retrieval error:', error);
    return NextResponse.json({ success: false, error: 'Failed to retrieve notes' }, { status: 500 });
  }
}

/** POST /api/notes — save note content for a video */
export async function POST(request: NextRequest) {
  try {
    const authUser = await requireAuth();
    const body = await request.json();
    const content = typeof body.content === 'string' ? body.content : '';
    const videoId = typeof body.videoId === 'string' ? body.videoId.trim() : '';

    if (!videoId) {
      return NextResponse.json({ success: false, error: 'videoId required' }, { status: 400 });
    }

    const saved = await saveVideoNote(authUser.id, videoId, content);
    return NextResponse.json({
      success: true,
      note: { content: saved.content, updatedAt: saved.updatedAt.getTime() },
    });
  } catch (error) {
    console.error('Note save error:', error);
    return NextResponse.json({ success: false, error: 'Failed to save note' }, { status: 500 });
  }
}
