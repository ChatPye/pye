// Referral system utilities and logic
import { DEFAULT_SYSTEM_CONFIG } from './subscription-tiers';

export interface ReferralRewards {
  referrer: {
    xp: number;
    tokens: number;
  };
  referee: {
    xp: number;
    tokens: number;
  };
}

export interface ReferralEvent {
  type: 'signup' | 'activation' | 'first_note' | 'subscription';
  referrerUserId: string;
  refereeUserId: string;
  referralCode: string;
  rewards: ReferralRewards;
  timestamp: Date;
}

// Referral reward configuration
export const REFERRAL_REWARDS: Record<string, ReferralRewards> = {
  signup: {
    referrer: {
      xp: DEFAULT_SYSTEM_CONFIG.xpRewards.referralSignup,
      tokens: 20,
    },
    referee: {
      xp: 10,
      tokens: 10,
    },
  },
  activation: {
    referrer: {
      xp: DEFAULT_SYSTEM_CONFIG.xpRewards.referralActivation,
      tokens: 15,
    },
    referee: {
      xp: 5,
      tokens: 5,
    },
  },
  first_note: {
    referrer: {
      xp: 10,
      tokens: 5,
    },
    referee: {
      xp: 5,
      tokens: 5,
    },
  },
  subscription: {
    referrer: {
      xp: 50,
      tokens: 100,
    },
    referee: {
      xp: 25,
      tokens: 50,
    },
  },
};

export function generateReferralCode(): string {
  const prefix = 'CHATPYE';
  const randomPart = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `${prefix}${randomPart}`;
}

export function validateReferralCode(code: string): boolean {
  // Basic validation: starts with CHATPYE and is 13 characters long
  return /^CHATPYE[A-Z0-9]{6}$/.test(code);
}

export function getReferralRewards(eventType: keyof typeof REFERRAL_REWARDS): ReferralRewards {
  return REFERRAL_REWARDS[eventType] || REFERRAL_REWARDS.signup;
}

export function calculateReferralBonus(
  baseRewards: ReferralRewards,
  multiplier: number = 1
): ReferralRewards {
  return {
    referrer: {
      xp: Math.floor(baseRewards.referrer.xp * multiplier),
      tokens: Math.floor(baseRewards.referrer.tokens * multiplier),
    },
    referee: {
      xp: Math.floor(baseRewards.referee.xp * multiplier),
      tokens: Math.floor(baseRewards.referee.tokens * multiplier),
    },
  };
}

export function createReferralLink(
  baseUrl: string,
  referralCode: string,
  campaign?: string
): string {
  const url = new URL('/start', baseUrl);
  url.searchParams.set('ref', referralCode);
  if (campaign) {
    url.searchParams.set('utm_campaign', campaign);
  }
  return url.toString();
}

export function parseReferralFromUrl(url: string): {
  referralCode?: string;
  campaign?: string;
} {
  try {
    const urlObj = new URL(url);
    return {
      referralCode: urlObj.searchParams.get('ref') || undefined,
      campaign: urlObj.searchParams.get('utm_campaign') || undefined,
    };
  } catch {
    return {};
  }
}

export function getReferralStats(
  totalReferrals: number,
  successfulReferrals: number,
  totalRewards: number
) {
  const conversionRate = totalReferrals > 0 ? (successfulReferrals / totalReferrals) * 100 : 0;
  const averageReward = successfulReferrals > 0 ? totalRewards / successfulReferrals : 0;
  
  return {
    totalReferrals,
    successfulReferrals,
    totalRewards,
    conversionRate: Math.round(conversionRate * 100) / 100,
    averageReward: Math.round(averageReward * 100) / 100,
  };
}

export function isReferralEligible(
  userCreatedAt: Date,
  referralUsedAt?: Date
): boolean {
  // User can only use referral code if they haven't used one before
  // and it's within 24 hours of account creation
  const hoursSinceCreation = (Date.now() - userCreatedAt.getTime()) / (1000 * 60 * 60);
  return !referralUsedAt && hoursSinceCreation <= 24;
}

export function getReferralTierMultiplier(userTier: string): number {
  // Higher tier users get bonus rewards for referrals
  const multipliers: Record<string, number> = {
    free: 1.0,
    pro: 1.2,
    enterprise: 1.5,
  };
  
  return multipliers[userTier] || 1.0;
}

export function shouldAwardReferralBonus(
  eventType: string,
  userTier: string,
  referralCount: number
): boolean {
  // Award bonus for milestone referrals
  const milestones = [5, 10, 25, 50, 100];
  const isMilestone = milestones.includes(referralCount);
  
  // Award bonus for subscription referrals
  const isSubscriptionReferral = eventType === 'subscription';
  
  // Award bonus for high-tier users
  const isHighTier = userTier === 'enterprise';
  
  return isMilestone || isSubscriptionReferral || isHighTier;
}

export function getMilestoneBonus(referralCount: number): number {
  if (referralCount >= 100) return 2.0;
  if (referralCount >= 50) return 1.8;
  if (referralCount >= 25) return 1.6;
  if (referralCount >= 10) return 1.4;
  if (referralCount >= 5) return 1.2;
  return 1.0;
}
