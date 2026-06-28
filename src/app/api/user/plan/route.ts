import { NextResponse } from 'next/server'
import { getUser } from '@/lib/auth'
import { getInviteCountForTenant, getPlanLimits, getUserPlanAndTenant } from '@/lib/plans'

export async function GET() {
  const user = await getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { plan, tenantId } = await getUserPlanAndTenant(user.id)
  const limits = getPlanLimits(plan)
  const inviteUsed = await getInviteCountForTenant(tenantId)

  return NextResponse.json({
    plan,
    tenantId,
    inviteUsed,
    inviteLimit: Number(limits.invites ?? 2),
  })
}
