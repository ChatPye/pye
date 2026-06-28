import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { getUserPlanAndTenant } from '@/lib/plans'
import { connectDocumentDB } from '@/server/db/documentdb'
import { ShareLink } from '@/data/models/ShareLink'

declare global {
  // eslint-disable-next-line no-var
  var __CHATPYE_SHARE_LINKS__: Map<string, any> | undefined
}

function getMemoryShareStore() {
  if (!global.__CHATPYE_SHARE_LINKS__) {
    global.__CHATPYE_SHARE_LINKS__ = new Map<string, any>()
  }
  return global.__CHATPYE_SHARE_LINKS__
}

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ shareId: string }> }
) {
  try {
    const { userId } = await auth()
    const { shareId } = await context.params

    const db = await connectDocumentDB()
    let shareData: any | null = null

    if (db) {
      shareData = await ShareLink.findOne({ shareId }).lean()
    } else {
      shareData = getMemoryShareStore().get(shareId) ?? null
    }

    if (!shareData) {
      return NextResponse.json({ error: 'Share not found or expired' }, { status: 404 })
    }

    if (shareData.expiresAt && new Date(shareData.expiresAt) < new Date()) {
      return NextResponse.json({ error: 'Share expired' }, { status: 410 })
    }

    const isOwner = userId && shareData.userId === userId
    const isPublic = shareData.type === 'public'
    let hasPlanAccess = false
    if (!isOwner && !isPublic) {
      if (userId) {
        const planInfo = await getUserPlanAndTenant(userId)
        if (planInfo && (planInfo.plan?.startsWith('enterprise') || planInfo.plan === 'business_team')) {
          hasPlanAccess = true
        }
      }
      if (!hasPlanAccess) {
        return NextResponse.json({ error: 'Access denied' }, { status: 403 })
      }
    }

    return NextResponse.json({ 
      success: true, 
      data: {
        id: shareData.shareId || shareId,
        content: shareData.content,
        videoId: shareData.videoId,
        type: shareData.type,
        userId: shareData.userId,
        createdAt: shareData.createdAt,
        expiresAt: shareData.expiresAt,
      }
    })
  } catch (error) {
    console.error('Error fetching share:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
