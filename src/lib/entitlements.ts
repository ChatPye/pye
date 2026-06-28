export type Entitlement = {
  success: boolean
  entitled: boolean
  plan: 'free' | 'pro' | 'enterprise'
}

export async function fetchEntitlement(baseUrl?: string): Promise<Entitlement> {
  try {
    const url = baseUrl ? `${baseUrl}/api/entitlement` : '/api/entitlement'
    const res = await fetch(url, { cache: 'no-store' })
    if (!res.ok) return { success: false, entitled: false, plan: 'free' }
    const data = await res.json()
    return { success: true, entitled: !!data?.entitled, plan: (data?.plan ?? 'free') }
  } catch {
    return { success: false, entitled: false, plan: 'free' }
  }
}

export function isPremium(plan: string | undefined): boolean {
  return plan === 'pro' || plan === 'enterprise'
}


