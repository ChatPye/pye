export type PlanConfig = {
  key: string
  label: string
  price: number
  currency: string
  limits?: Record<string, number | string>
  stripeProductId?: string
  stripePriceId?: string
  externalTier?: 'community' | 'amplify' | 'arena' | null
}

declare global {
  // eslint-disable-next-line no-var
  var __CHATPYE_PRICING__: Record<string, PlanConfig> | undefined
}

function defaultPricing(): Record<string, PlanConfig> {
  return {
    freemium: {
      key: 'freemium',
      label: 'Freemium',
      price: 0,
      currency: 'USD',
      limits: { invites: 2, videosPerMonth: 2 },
    },
    pro: {
      key: 'pro',
      label: 'Pro',
      price: 20,
      currency: 'USD',
      limits: { invites: 25, videosPerMonth: 20 },
    },
    business_starter: {
      key: 'business_starter',
      label: 'Business Starter',
      price: 99,
      currency: 'USD',
      limits: { invites: 50, videosPerMonth: 60 },
    },
    business_team: {
      key: 'business_team',
      label: 'Business Team',
      price: 199,
      currency: 'USD',
      limits: { invites: 150, videosPerMonth: 180 },
    },
    enterprise_community: {
      key: 'enterprise_community',
      label: 'Enterprise Community',
      price: 0,
      currency: 'USD',
      limits: { invites: 500, videosPerMonth: -1 },
      externalTier: 'community',
    },
    enterprise_promo: {
      key: 'enterprise_promo',
      label: 'Enterprise (Promo)',
      price: 999,
      currency: 'USD',
      limits: { invites: 500, videosPerMonth: -1 },
    },
    community: {
      key: 'community',
      label: 'Community Reach',
      price: 3000,
      currency: 'USD',
      limits: { invites: 1000, videosPerMonth: -1 },
      externalTier: 'community',
    },
    amplify: {
      key: 'amplify',
      label: 'Growth Amplify',
      price: 10000,
      currency: 'USD',
      limits: { invites: 5000, videosPerMonth: -1 },
      externalTier: 'amplify',
    },
    arena: {
      key: 'arena',
      label: 'Arena Scale',
      price: -1,
      currency: 'USD',
      limits: { invites: 10000, videosPerMonth: -1 },
      externalTier: 'arena',
    },
  }
}

export function getPricing(): Record<string, PlanConfig> {
  if (!global.__CHATPYE_PRICING__) {
    global.__CHATPYE_PRICING__ = defaultPricing()
  }
  return global.__CHATPYE_PRICING__!
}

export function getPlanLimits(planKey: string) {
  const plans = getPricing()
  return plans[planKey]?.limits || { invites: 2 }
}

