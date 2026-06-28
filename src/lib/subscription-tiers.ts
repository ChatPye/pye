// Subscription-based token allocation system
export interface SubscriptionTier {
  id: string;
  name: string;
  price: number; // Monthly price in cents
  maxTokens: number; // Monthly token allocation
  features: string[];
  stripePriceId?: string;
}

export interface TokenAllocation {
  tier: string;
  maxTokens: number;
  currentTokens: number;
  resetDate: Date;
  rolloverTokens: number; // Tokens that roll over to next month
}

// Configurable subscription tiers
export const SUBSCRIPTION_TIERS: Record<string, SubscriptionTier> = {
  FREE: {
    id: 'free',
    name: 'Free',
    price: 0,
    maxTokens: 50, // Configurable via admin panel
    features: ['YouTube transcript processing', 'Basic note-taking', '5 requests/day'],
  },
  PRO: {
    id: 'pro',
    name: 'Pro',
    price: 1999, // $19.99/month
    maxTokens: 500,
    features: ['Everything in Free', 'Unlimited requests', 'Priority processing', 'Custom uploads'],
    stripePriceId: 'price_pro_monthly', // Set in Stripe
  },
  ENTERPRISE: {
    id: 'enterprise',
    name: 'Enterprise',
    price: 9999, // $99.99/month
    maxTokens: 2500,
    features: ['Everything in Pro', 'Team collaboration', 'API access', 'Custom integrations'],
    stripePriceId: 'price_enterprise_monthly', // Set in Stripe
  },
};

// Configurable XP and referral rules
export interface SystemConfig {
  freeTokens: number;
  xpRewards: {
    firstNote: number;
    dailyLogin: number;
    referralSignup: number;
    referralActivation: number;
    feedbackSubmission: number;
    videoWatched: number;
    noteCreated: number;
  };
  tokenCosts: {
    youtubeTranscript: number;
    videoSummary: number;
    noteCreation: number;
    noteUpdate: number;
    bookmarkCreation: number;
    customUpload: number;
  };
  xpLevels: Array<{
    level: number;
    minXP: number;
    maxXP: number;
    tokenReward: number;
  }>;
}

// Default system configuration (can be overridden by admin)
export const DEFAULT_SYSTEM_CONFIG: SystemConfig = {
  freeTokens: 50,
  xpRewards: {
    firstNote: 10,
    dailyLogin: 5,
    referralSignup: 25,
    referralActivation: 15,
    feedbackSubmission: 10,
    videoWatched: 2,
    noteCreated: 3,
  },
  tokenCosts: {
    youtubeTranscript: 5,
    videoSummary: 10,
    noteCreation: 1,
    noteUpdate: 1,
    bookmarkCreation: 1,
    customUpload: 15,
  },
  xpLevels: [
    { level: 1, minXP: 0, maxXP: 99, tokenReward: 10 },
    { level: 2, minXP: 100, maxXP: 199, tokenReward: 25 },
    { level: 3, minXP: 200, maxXP: 299, tokenReward: 50 },
    { level: 4, minXP: 300, maxXP: 499, tokenReward: 100 },
    { level: 5, minXP: 500, maxXP: 999, tokenReward: 200 },
  ],
};

export function getSubscriptionTier(tierId: string): SubscriptionTier {
  return SUBSCRIPTION_TIERS[tierId.toUpperCase()] || SUBSCRIPTION_TIERS.FREE;
}

export function calculateTokenAllocation(
  tier: SubscriptionTier,
  currentTokens: number,
  lastReset: Date
): TokenAllocation {
  const now = new Date();
  const nextReset = new Date(lastReset);
  nextReset.setMonth(nextReset.getMonth() + 1);
  
  // If it's a new month, reset tokens
  if (now >= nextReset) {
    return {
      tier: tier.id,
      maxTokens: tier.maxTokens,
      currentTokens: tier.maxTokens,
      resetDate: nextReset,
      rolloverTokens: 0, // No rollover for now
    };
  }
  
  return {
    tier: tier.id,
    maxTokens: tier.maxTokens,
    currentTokens,
    resetDate: nextReset,
    rolloverTokens: 0,
  };
}

export function canAffordAction(
  currentTokens: number,
  action: keyof SystemConfig['tokenCosts'],
  config: SystemConfig = DEFAULT_SYSTEM_CONFIG
): boolean {
  return currentTokens >= config.tokenCosts[action];
}

export function getActionCost(
  action: keyof SystemConfig['tokenCosts'],
  config: SystemConfig = DEFAULT_SYSTEM_CONFIG
): number {
  return config.tokenCosts[action];
}
