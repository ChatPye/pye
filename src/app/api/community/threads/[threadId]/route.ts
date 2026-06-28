'use server'

import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { connectDocumentDB } from '@/server/db/documentdb'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ threadId: string }> }
) {
  try {
    const auth = await requireAuth()
    const { threadId } = await params
    const body = await request.json()
    const { content } = body as { content?: string }
    if (!content) {
      return NextResponse.json({ success: false, error: 'content is required' }, { status: 400 })
    }

    const reply = {
      id: `${Date.now()}`,
      authorId: (auth as any).userId || 'user',
      authorName: 'You',
      content,
      createdAt: new Date().toISOString(),
    }

    try {
      const db = await connectDocumentDB()
      if (db?.connection?.db) {
        const collection = db.connection.db.collection('threads')
        const update = await collection.updateOne(
          { id: threadId },
          { $push: { replies: reply }, $set: { updatedAt: new Date().toISOString() } } as any
        )
        if (update.modifiedCount === 0) {
          return NextResponse.json({ success: false, error: 'Thread not found' }, { status: 404 })
        }
        return NextResponse.json({ success: true, reply })
      }
    } catch {}

    return NextResponse.json({ success: true, reply })
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }
}

export async function PUT(
  _request: NextRequest,
  { params }: { params: Promise<{ threadId: string }> }
) {
  try {
    await requireAuth()
    const { threadId } = await params

    try {
      const db = await connectDocumentDB()
      if (db?.connection?.db) {
        const collection = db.connection.db.collection('threads')
        const update = await collection.updateOne({ id: threadId }, { $set: { isPinned: true } })
        if (update.modifiedCount === 0) {
          return NextResponse.json({ success: false, error: 'Thread not found' }, { status: 404 })
        }
        return NextResponse.json({ success: true })
      }
    } catch {}

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }
}


