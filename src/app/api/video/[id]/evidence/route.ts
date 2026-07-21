import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { getDb, isDatabaseConfigured, schema } from '@/lib/db'
import { and, desc, eq, ne } from 'drizzle-orm'

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireAuth()
    const { id: externalVideoId } = await params
    if (!isDatabaseConfigured()) return NextResponse.json({ success: true, evidence: [] })
    const db = getDb()
    const [video] = await db.select({ id: schema.videos.id, ownerClerkId: schema.videos.ownerClerkId }).from(schema.videos).where(eq(schema.videos.externalId, externalVideoId)).limit(1)
    if (!video) return NextResponse.json({ success: false, error: 'Video not found' }, { status: 404 })
    if (video.ownerClerkId !== user.id) return NextResponse.json({ success: false, error: 'Only the video owner can review learner evidence.' }, { status: 403 })
    const rows = await db.select({ ownerClerkId: schema.learningEvents.ownerClerkId, type: schema.learningEvents.type, payload: schema.learningEvents.payload, createdAt: schema.learningEvents.createdAt }).from(schema.learningEvents).where(and(eq(schema.learningEvents.videoId, video.id), ne(schema.learningEvents.ownerClerkId, user.id))).orderBy(desc(schema.learningEvents.createdAt)).limit(100)
    return NextResponse.json({ success: true, evidence: rows })
  } catch (error) {
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : 'Unable to load evidence' }, { status: 500 })
  }
}
