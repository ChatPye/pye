import { NextResponse } from 'next/server'
import { getOrgContext } from '@/lib/hr-auth'

export async function GET() {
  const ctx = await getOrgContext()
  if (!ctx) {
    return NextResponse.json({ isHr: false })
  }

  const isHr =
    ['hr', 'admin', 'manager', 'trainer'].includes(ctx.role) ||
    ctx.user.subscription?.tier === 'enterprise'

  return NextResponse.json({
    isHr,
    role: ctx.role,
    orgSlug: ctx.orgSlug,
  })
}
