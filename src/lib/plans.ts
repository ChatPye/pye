import 'server-only'

import { clerkClient } from '@clerk/nextjs/server'
import { getPlanLimits } from '@/lib/pricing'
import { connectDocumentDB } from '@/server/db/documentdb'
import { ShareLink } from '@/data/models/ShareLink'

export { getPlanLimits }

const memoryShareCounts = new Map<string, number>()

/**
 * Look up the user's assigned tenant/org and plan. Prefers Clerk metadata, falls back to defaults.
 */
export async function getUserPlanAndTenant(userId: string) {
  try {
    const user = await clerkClient.users.getUser(userId)
    const metadata = user.publicMetadata || {}
    const plan = typeof metadata.plan === 'string' ? metadata.plan : 'freemium'
    const tenantId = typeof metadata.tenantId === 'string'
      ? metadata.tenantId
      : typeof metadata.orgId === 'string'
        ? metadata.orgId
        : `tenant_${userId}`
    const seats = metadata.tenantSeats !== undefined ? Number(metadata.tenantSeats) : undefined
    return { plan, tenantId, seats }
  } catch (error) {
    console.warn('[Plans] Falling back to default plan for user', userId, error)
    return { plan: 'freemium', tenantId: `tenant_${userId}`, seats: undefined }
  }
}

/**
 * Count invites/shares for a tenant in the last 30 days.
 */
export async function getInviteCountForTenant(tenantId: string): Promise<number> {
  const db = await connectDocumentDB()
  if (db) {
    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    return ShareLink.countDocuments({ tenantId, createdAt: { $gte: since } })
  }
  return memoryShareCounts.get(tenantId) ?? 0
}

export function incrementTenantShareCount(tenantId: string) {
  memoryShareCounts.set(tenantId, (memoryShareCounts.get(tenantId) ?? 0) + 1)
}
