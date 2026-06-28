import { NextResponse } from 'next/server'
import { requireHrAccess } from '@/lib/hr-auth'
import { getHrDashboard } from '@/lib/db/course-repository'

export async function GET() {
  try {
    const ctx = await requireHrAccess()
    const dashboard = await getHrDashboard(ctx.orgSlug)
    return NextResponse.json({ success: true, ...dashboard, role: ctx.role })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unauthorized'
    return NextResponse.json({ error: message }, { status: 403 })
  }
}
