import { NextRequest, NextResponse } from 'next/server'

type Tenant = {
  id: string
  orgName: string
  planKey: string
  externalUserLimit?: number
  seats?: number
  createdAt: string
}

declare global {
  // eslint-disable-next-line no-var
  var __CHATPYE_TENANTS__: Map<string, Tenant> | undefined
}

function getTenantStore(): Map<string, Tenant> {
  if (!global.__CHATPYE_TENANTS__) {
    global.__CHATPYE_TENANTS__ = new Map<string, Tenant>()
  }
  return global.__CHATPYE_TENANTS__!
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({})) as { orgName?: string; planKey?: string; externalUserLimit?: number; seats?: number }
    const { orgName, planKey = 'enterprise_community', externalUserLimit = 500, seats } = body || {}

    if (!orgName) {
      return NextResponse.json({ error: 'orgName is required' }, { status: 400 })
    }

    const tenants = getTenantStore()
    const id = `tnt_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
    const tenant: Tenant = {
      id,
      orgName,
      planKey,
      externalUserLimit,
      seats: planKey === 'business_team' || planKey === 'business_starter' ? seats ?? 1 : undefined,
      createdAt: new Date().toISOString(),
    }
    tenants.set(id, tenant)

    return NextResponse.json({ ok: true, tenant })
  } catch (_e) {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}


