import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { getUserPlanAndTenant, getInviteCountForTenant, getPlanLimits, incrementTenantShareCount } from '@/lib/plans'
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

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { content, videoId, type = 'response' } = await request.json()
    
    if (!content || !videoId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Enforce invite/share seat limits
    const planInfo = await getUserPlanAndTenant(userId)
    if (!planInfo) {
      return NextResponse.json({ error: 'No assigned plan/tenant for user' }, { status: 403 })
    }
    const { plan, tenantId, seats } = planInfo
    const planLimits = getPlanLimits(plan)

    const inviteCount = await getInviteCountForTenant(tenantId)
    const used = Number(inviteCount ?? 0)
    const max = planLimits.invites !== undefined ? Number(planLimits.invites) : undefined
    if (max !== undefined && used >= max) {
      return NextResponse.json({ error: `Invite/share limit reached for your current plan (${max})` }, { status: 403 })
    }

    if ((plan === 'business_team' || plan === 'business_starter') && seats !== undefined) {
      if (used >= Number(seats)) {
        return NextResponse.json({ error: `Seat limit (${seats}) reached. Upgrade for more.` }, { status: 403 })
      }
    }

    const shareId = `share_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    
    const shareData = {
      shareId,
      tenantId,
      userId,
      videoId,
      type,
      content,
      createdAt: new Date(),
      expiresAt,
    }

    const db = await connectDocumentDB()
    if (db) {
      await ShareLink.create(shareData)
    } else {
      const store = getMemoryShareStore()
      store.set(shareId, shareData)
      incrementTenantShareCount(tenantId)
    }
    
    return NextResponse.json({ 
      success: true, 
      shareId,
      shareUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/shared/${shareId}`,
    })
  } catch (error) {
    console.error('Error creating share:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}