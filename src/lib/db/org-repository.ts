import { eq } from 'drizzle-orm'
import { getDb, isDatabaseConfigured, schema } from '@/lib/db'
import type { OrgRole } from '@/lib/hr-auth'

export async function getOrCreateOrganization(slug: string, name?: string) {
  if (!isDatabaseConfigured()) return null

  const db = getDb()
  const [existing] = await db
    .select()
    .from(schema.organizations)
    .where(eq(schema.organizations.slug, slug))
    .limit(1)

  if (existing) return existing

  const [created] = await db
    .insert(schema.organizations)
    .values({
      slug,
      name: name || slug.replace(/_/g, ' '),
      plan: 'enterprise',
    })
    .returning()

  return created
}

export async function getOrCreateUserByClerk(input: {
  clerkUserId: string
  email: string
  name: string
  orgId?: string
  role?: OrgRole
}) {
  if (!isDatabaseConfigured()) return null

  const db = getDb()
  const [existing] = await db
    .select()
    .from(schema.users)
    .where(eq(schema.users.clerkUserId, input.clerkUserId))
    .limit(1)

  if (existing) return existing

  const [created] = await db
    .insert(schema.users)
    .values({
      clerkUserId: input.clerkUserId,
      email: input.email,
      name: input.name,
      orgId: input.orgId ?? null,
      role: input.role ?? 'employee',
    })
    .returning()

  return created
}

export async function findUserByClerkId(clerkUserId: string) {
  if (!isDatabaseConfigured()) return null
  const db = getDb()
  const [row] = await db
    .select()
    .from(schema.users)
    .where(eq(schema.users.clerkUserId, clerkUserId))
    .limit(1)
  return row ?? null
}

export async function findUserByEmail(email: string) {
  if (!isDatabaseConfigured()) return null
  const db = getDb()
  const [row] = await db
    .select()
    .from(schema.users)
    .where(eq(schema.users.email, email.toLowerCase()))
    .limit(1)
  return row ?? null
}
