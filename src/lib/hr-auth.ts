import { auth } from '@clerk/nextjs/server'
import { requireAuth, type User } from '@/lib/auth'
import { getUserPlanAndTenant } from '@/lib/plans'

export type OrgRole = 'employee' | 'manager' | 'hr' | 'admin' | 'trainer'

export interface HrContext {
  user: User
  clerkUserId: string
  orgSlug: string
  role: OrgRole
}

const HR_ROLES: OrgRole[] = ['hr', 'admin', 'manager', 'trainer']
const ADMIN_EMAILS = ['job@chatpye.com', 'admin@chatpye.com', 'deborah@chatpye.com']

function roleFromClaims(sessionClaims: Record<string, unknown> | undefined): OrgRole {
  const metadata = (sessionClaims?.metadata ?? sessionClaims?.publicMetadata) as
    | Record<string, unknown>
    | undefined
  const publicMeta = sessionClaims?.publicMetadata as Record<string, unknown> | undefined
  const role =
    (publicMeta?.role as string) ||
    (metadata?.role as string) ||
    (publicMeta?.orgRole as string) ||
    'employee'
  if (HR_ROLES.includes(role as OrgRole)) return role as OrgRole
  return 'employee'
}

export async function getOrgContext(): Promise<HrContext | null> {
  if (process.env.DEV_AUTH_BYPASS === 'true') {
    const user = await requireAuth()
    return {
      user,
      clerkUserId: user.id,
      orgSlug: process.env.DEV_ORG_SLUG || 'dev-org',
      role: (process.env.DEV_HR_ROLE as OrgRole) || 'hr',
    }
  }

  const { userId, sessionClaims } = await auth()
  if (!userId) return null

  const user = await requireAuth()
  const { tenantId } = await getUserPlanAndTenant(userId)
  let role = roleFromClaims(sessionClaims as Record<string, unknown>)

  if (ADMIN_EMAILS.includes(user.email)) {
    role = 'admin'
  } else if (user.subscription?.tier === 'enterprise' && role === 'employee') {
    role = 'hr'
  }

  return {
    user,
    clerkUserId: userId,
    orgSlug: tenantId,
    role,
  }
}

export async function requireHrAccess(): Promise<HrContext> {
  const ctx = await getOrgContext()
  if (!ctx) {
    throw new Error('Authentication required')
  }
  if (!HR_ROLES.includes(ctx.role) && !ADMIN_EMAILS.includes(ctx.user.email)) {
    throw new Error('HR or manager access required')
  }
  return ctx
}

export function isHrRole(role: OrgRole): boolean {
  return HR_ROLES.includes(role)
}
