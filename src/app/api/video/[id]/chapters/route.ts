import { NextRequest, NextResponse } from 'next/server';
import { generateChaptersFromTranscript } from '@/lib/chapter-generation';
import { findVideoByExternalId } from '@/lib/db/video-repository';
import { getMemoryVideo } from '@/data/stores/videoMemoryStore';
import { logger } from '@/lib/logger';

type Chapter = { start: number; title: string; summary?: string };

declare global {
  // eslint-disable-next-line no-var
  var __CHATPYE_CHAPTERS__: Map<string, Chapter[]> | undefined;
}

function getStore(): Map<string, Chapter[]> {
  if (!global.__CHATPYE_CHAPTERS__) {
    global.__CHATPYE_CHAPTERS__ = new Map<string, Chapter[]>();
  }
  return global.__CHATPYE_CHAPTERS__!;
}

async function loadVideo(id: string) {
  const aurora = await findVideoByExternalId(id);
  if (aurora) return aurora;
  return getMemoryVideo(id);
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const store = getStore();
    let chapters = store.get(id) ?? [];

    if (chapters.length === 0) {
      const video = await loadVideo(id);

      if (video?.chapters?.length) {
        chapters = video.chapters;
        store.set(id, chapters);
      } else if (video?.transcript?.length) {
        try {
          chapters = await generateChaptersFromTranscript(
            video.transcript,
            video.duration
          );
          if (chapters.length > 0) store.set(id, chapters);
        } catch (error) {
          logger.error(
            'Chapter generation error',
            error instanceof Error ? error : new Error(String(error)),
            { videoId: id }
          );
        }
      }
    }

    return NextResponse.json({ chapters });
  } catch (error) {
    logger.error('Chapter GET error', error instanceof Error ? error : new Error(String(error)));
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const isDevBypass = request.headers.get('X-Dev-Bypass') === 'true';

    if (isDevBypass || process.env.DEV_FORCE_IN_MEMORY === 'true') {
      const mock: Chapter[] = [
        { start: 0, title: 'Introduction', summary: 'Overview and goals' },
        { start: 300, title: 'Core Concept A', summary: 'Deep dive' },
        { start: 900, title: 'Demo/Walkthrough', summary: 'Live implementation' },
        { start: 1500, title: 'Summary & Next Steps' },
      ];
      getStore().set(id, mock);
      return NextResponse.json({ ok: true, chapters: mock });
    }

    const video = await loadVideo(id);

    if (video?.chapters?.length) {
      getStore().set(id, video.chapters);
      return NextResponse.json({ ok: true, chapters: video.chapters });
    }

    if (video?.transcript?.length) {
      const chapters = await generateChaptersFromTranscript(
        video.transcript,
        video.duration
      );
      getStore().set(id, chapters);
      return NextResponse.json({ ok: true, chapters });
    }

    // Still processing — return empty, not 500
    if (video && video.processingStatus !== 'complete') {
      return NextResponse.json({ ok: true, chapters: [], pending: true });
    }

    const body = await request.json().catch(() => ({}));
    const { chapters } = body ?? {};
    if (!Array.isArray(chapters)) {
      return NextResponse.json(
        { error: 'chapters array required or video must have transcript' },
        { status: 400 }
      );
    }
    getStore().set(id, chapters);
    return NextResponse.json({ ok: true, chapters });
  } catch (error) {
    logger.error('Chapter POST error', error instanceof Error ? error : new Error(String(error)));
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
