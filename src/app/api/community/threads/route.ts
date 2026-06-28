'use server'

import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { connectDocumentDB } from '@/server/db/documentdb'

type Thread = {
  id: string
  videoId: string
  title: string
  content: string
  authorId: string
  authorName?: string
  isPinned?: boolean
  createdAt: string
  updatedAt: string
  replies?: Array<{
    id: string
    authorId: string
    authorName?: string
    content: string
    createdAt: string
  }>
}

const inMemoryThreads = new Map<string, Thread[]>() // key: videoId

export async function GET(request: NextRequest) {
  try {
    await requireAuth()
    const { searchParams } = new URL(request.url)
    const videoId = searchParams.get('videoId')
    if (!videoId) {
      return NextResponse.json({ success: false, error: 'videoId is required' }, { status: 400 })
    }

    try {
      const db = await connectDocumentDB()
      if (db?.connection?.db) {
        const collection = db.connection.db.collection('threads')
        const docs = (await collection
          .find({ videoId })
          .sort({ isPinned: -1, updatedAt: -1 })
          .toArray()) as unknown as Thread[]
        return NextResponse.json({ success: true, threads: docs })
      }
    } catch {}

    const items = inMemoryThreads.get(videoId) || []
    return NextResponse.json({ success: true, threads: items })
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth()
    const body = await request.json()
    const { videoId, title, content } = body as { videoId?: string; title?: string; content?: string }
    if (!videoId || !title || !content) {
      return NextResponse.json({ success: false, error: 'videoId, title and content are required' }, { status: 400 })
    }

    const now = new Date().toISOString()
    const thread: Thread = {
      id: `${Date.now()}`,
      videoId,
      title,
      content,
      authorId: (auth as any).userId || 'user',
      authorName: 'You',
      isPinned: false,
      createdAt: now,
      updatedAt: now,
      replies: [],
    }

    try {
      const db = await connectDocumentDB()
      if (db?.connection?.db) {
        const collection = db.connection.db.collection('threads')
        await collection.insertOne(thread as any)
        return NextResponse.json({ success: true, thread })
      }
    } catch {}

    const items = inMemoryThreads.get(videoId) || []
    items.unshift(thread)
    inMemoryThreads.set(videoId, items)
    return NextResponse.json({ success: true, thread })
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }
}


