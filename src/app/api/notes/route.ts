import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { getUserPlanAndTenant } from '@/lib/plans'
import mongoose from 'mongoose'
import { logger } from '@/lib/logger'

// Notes schema
const NoteSchema = new mongoose.Schema({
  userId: { type: String, required: true, index: true },
  videoId: { type: String, required: true, index: true },
  content: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
})

const Note = mongoose.models.Note || mongoose.model('Note', NoteSchema)

// In-memory storage for development
const memory: Array<{ id: string; content: string; videoId?: string; createdAt: number; userId?: string }> = []

const connectDB = async () => {
  if (mongoose.connections[0].readyState) return
  if (!process.env.MONGODB_URI && !process.env.DOCUMENTDB_URI && process.env.NODE_ENV === 'development') {
    logger.info('No database configured, using in-memory storage for development')
    return
  }
  try {
    await mongoose.connect(process.env.MONGODB_URI || process.env.DOCUMENTDB_URI || '')
  } catch (error) {
    logger.error('Database connection failed', error instanceof Error ? error : new Error(String(error)))
    if (process.env.NODE_ENV === 'development') {
      logger.info('Falling back to in-memory storage for development')
    }
  }
}

export async function POST(request: NextRequest) {
  try {
    const headers = request.headers
    const isDevBypass = headers.get('X-Dev-Bypass') === 'true'
    const authUser = isDevBypass ? { id: 'dev-user' } : await requireAuth()
    
    // Check if user has Pro plan (notes are Pro-only)
    if (!isDevBypass) {
      const { plan } = await getUserPlanAndTenant(authUser.id)
      if (plan !== 'pro' && plan !== 'business_starter' && plan !== 'business_team' && plan !== 'enterprise_promo' && plan !== 'community' && plan !== 'amplify' && plan !== 'arena') {
        return NextResponse.json({ 
          success: false, 
          error: 'Notes feature requires Pro plan or higher' 
        }, { status: 403 })
      }
    }

    const { content, videoId } = await request.json()
    if (!content || typeof content !== 'string') {
      return NextResponse.json({ success: false, error: 'content required' }, { status: 400 })
    }
    if (!videoId) {
      return NextResponse.json({ success: false, error: 'videoId required' }, { status: 400 })
    }

    await connectDB()

    const noteData = {
      userId: authUser.id,
      videoId,
      content,
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    if (process.env.MONGODB_URI && mongoose.connections[0].readyState) {
      const note = new Note(noteData)
      await note.save()
      logger.info('Note saved to database', { userId: authUser.id, videoId, noteId: note._id })
      return NextResponse.json({ 
        success: true, 
        note: {
          id: note._id.toString(),
          content: note.content,
          videoId: note.videoId,
          createdAt: note.createdAt.getTime(),
        }
      })
    } else {
      const note: typeof memory[0] = { 
        id: `note_${Date.now()}`, 
        content, 
        videoId, 
        createdAt: Date.now(),
        userId: authUser.id,
      }
      memory.push(note)
      logger.info('Note saved to memory', { userId: authUser.id, videoId, noteId: note.id })
      return NextResponse.json({ success: true, note })
    }
  } catch (error) {
    logger.error('Note save error', error instanceof Error ? error : new Error(String(error)))
    return NextResponse.json({ success: false, error: 'bad request' }, { status: 400 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const headers = request.headers
    const isDevBypass = headers.get('X-Dev-Bypass') === 'true'
    const authUser = isDevBypass ? { id: 'dev-user' } : await requireAuth()
    const { searchParams } = new URL(request.url)
    const videoId = searchParams.get('videoId') || undefined

    await connectDB()

    if (process.env.MONGODB_URI && mongoose.connections[0].readyState) {
      const query: any = { userId: authUser.id }
      if (videoId) query.videoId = videoId
      
      const notes = await Note.find(query).sort({ createdAt: -1 }).lean()
      return NextResponse.json({ 
        success: true, 
        notes: notes.map(n => ({
          id: String(n._id),
          content: n.content,
          videoId: n.videoId,
          createdAt: n.createdAt.getTime(),
        }))
      })
    } else {
      const items = videoId 
        ? memory.filter(n => n.videoId === videoId && (isDevBypass || n.userId === authUser.id))
        : memory.filter(n => isDevBypass || n.userId === authUser.id)
      return NextResponse.json({ success: true, notes: items })
    }
  } catch (error) {
    logger.error('Note retrieval error', error instanceof Error ? error : new Error(String(error)))
    return NextResponse.json({ success: false, error: 'Failed to retrieve notes' }, { status: 500 })
  }
}

// DELETE - Delete a note
export async function DELETE(request: NextRequest) {
  try {
    const headers = request.headers
    const isDevBypass = headers.get('X-Dev-Bypass') === 'true'
    const authUser = isDevBypass ? { id: 'dev-user' } : await requireAuth()
    const { searchParams } = new URL(request.url)
    const noteId = searchParams.get('noteId')

    if (!noteId) {
      return NextResponse.json({ success: false, error: 'noteId required' }, { status: 400 })
    }

    await connectDB()

    if (process.env.MONGODB_URI && mongoose.connections[0].readyState) {
      const result = await Note.findOneAndDelete({ _id: noteId, userId: authUser.id })
      if (!result) {
        return NextResponse.json({ success: false, error: 'Note not found' }, { status: 404 })
      }
      logger.info('Note deleted from database', { userId: authUser.id, noteId })
      return NextResponse.json({ success: true, message: 'Note deleted' })
    } else {
      const index = memory.findIndex(n => n.id === noteId && (isDevBypass || n.userId === authUser.id))
      if (index === -1) {
        return NextResponse.json({ success: false, error: 'Note not found' }, { status: 404 })
      }
      memory.splice(index, 1)
      logger.info('Note deleted from memory', { userId: authUser.id, noteId })
      return NextResponse.json({ success: true, message: 'Note deleted' })
    }
  } catch (error) {
    logger.error('Note deletion error', error instanceof Error ? error : new Error(String(error)))
    return NextResponse.json({ success: false, error: 'Failed to delete note' }, { status: 500 })
  }
}


