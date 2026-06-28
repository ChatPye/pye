import { NextRequest, NextResponse } from 'next/server'
import { generateChaptersFromTranscript } from '@/lib/chapter-generation'
import { connectDocumentDB } from '@/server/db/documentdb'
import { VideoProcess } from '@/data/models/VideoProcess'
import { getMemoryVideo } from '@/data/stores/videoMemoryStore'
import { logger } from '@/lib/logger'

type Chapter = { start: number; title: string; summary?: string }

declare global {
  // eslint-disable-next-line no-var
  var __CHATPYE_CHAPTERS__: Map<string, Chapter[]> | undefined
}

function getStore(): Map<string, Chapter[]> {
  if (!global.__CHATPYE_CHAPTERS__) {
    global.__CHATPYE_CHAPTERS__ = new Map<string, Chapter[]>()
  }
  return global.__CHATPYE_CHAPTERS__!
}

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const store = getStore()
    let chapters = store.get(id) ?? []
    
    // If no chapters in cache, try to generate from transcript
    if (chapters.length === 0) {
      const db = await connectDocumentDB()
      let video = null
      
      if (db) {
        video = await VideoProcess.findOne({ videoId: id }).lean()
      } else {
        video = getMemoryVideo(id)
      }
      
      if (video && video.transcript && Array.isArray(video.transcript) && video.transcript.length > 0) {
        try {
          chapters = await generateChaptersFromTranscript(video.transcript, video.duration)
          if (chapters.length > 0) {
            store.set(id, chapters)
          }
        } catch (error) {
          logger.error('Chapter generation error', error instanceof Error ? error : new Error(String(error)), { videoId: id })
        }
      }
    }
    
    return NextResponse.json({ chapters })
  } catch (error) {
    logger.error('Chapter GET error', error instanceof Error ? error : new Error(String(error)))
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const isDevBypass = request.headers.get('X-Dev-Bypass') === 'true'

    // In dev, generate mock chapters fast if requested
    if (isDevBypass || process.env.DEV_FORCE_IN_MEMORY === 'true') {
      const mock: Chapter[] = [
        { start: 0, title: 'Introduction', summary: 'Overview and goals' },
        { start: 300, title: 'Core Concept A', summary: 'Deep dive' },
        { start: 900, title: 'Demo/Walkthrough', summary: 'Live implementation' },
        { start: 1500, title: 'Summary & Next Steps' },
      ]
      const store = getStore()
      store.set(id, mock)
      return NextResponse.json({ ok: true, chapters: mock })
    }

    // Try to get transcript from video record
    const db = await connectDocumentDB()
    let video = null
    
    if (db) {
      video = await VideoProcess.findOne({ videoId: id }).lean()
    } else {
      video = getMemoryVideo(id)
    }

    if (video && video.transcript && Array.isArray(video.transcript) && video.transcript.length > 0) {
      // Generate chapters from transcript using AI
      const chapters = await generateChaptersFromTranscript(video.transcript, video.duration)
      const store = getStore()
      store.set(id, chapters)
      return NextResponse.json({ ok: true, chapters })
    }

    // Fallback: accept chapters from request body
    const body = await request.json().catch(() => ({}))
    const { chapters } = body ?? {}
    if (!Array.isArray(chapters)) {
      return NextResponse.json({ error: 'chapters array required or video must have transcript' }, { status: 400 })
    }
    const store = getStore()
    store.set(id, chapters)
    return NextResponse.json({ ok: true, chapters })
  } catch (error) {
    logger.error('Chapter POST error', error instanceof Error ? error : new Error(String(error)))
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}


