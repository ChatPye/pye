import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'

type RoleRecord = { email: string; role: 'admin' | 'staff' | 'viewer' }
const memory = new Map<string, RoleRecord>()
const ALLOWLIST = new Set<string>(['job@chatpye.com'])

function isSuperAdmin(email?: string | null) {
  return !!email && ALLOWLIST.has(email.toLowerCase())
}

export async function GET() {
  const { userId, sessionClaims } = await auth()
  const email = (sessionClaims as any)?.email as string | undefined
  if (!userId || !isSuperAdmin(email)) return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
  return NextResponse.json({ success: true, users: Array.from(memory.values()) })
}

export async function POST(request: NextRequest) {
  const { userId, sessionClaims } = await auth()
  const email = (sessionClaims as any)?.email as string | undefined
  if (!userId || !isSuperAdmin(email)) return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
  const { email: targetEmail, role } = await request.json() as { email?: string; role?: 'admin'|'staff'|'viewer' }
  if (!targetEmail || !role) return NextResponse.json({ success: false, error: 'email and role required' }, { status: 400 })
  const rec = { email: targetEmail.toLowerCase(), role }
  memory.set(rec.email, rec)
  return NextResponse.json({ success: true, user: rec })
}


