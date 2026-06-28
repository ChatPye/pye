// Token system utilities
export interface TokenBalance {
  current: number;
  totalAllocated: number;
  lastRefill: Date;
}

export interface TokenTransaction {
  userId: string;
  type: 'usage' | 'refill' | 'bonus' | 'xp_reward' | 'referral';
  amount: number; // negative for usage
  description: string;
  timestamp: Date;
  metadata?: Record<string, any>;
}

export interface XPInfo {
  total: number;
  level: number;
  nextLevelAt: number;
  tokensFromXP: number;
}

// Token costs for different actions
export const TOKEN_COSTS = {
  YOUTUBE_TRANSCRIPT: 5,
  VIDEO_SUMMARY: 10,
  NOTE_CREATION: 1,
  NOTE_UPDATE: 1,
  BOOKMARK_CREATION: 1,
  CUSTOM_UPLOAD: 15,
} as const;

// XP thresholds and token rewards
export const XP_LEVELS = [
  { level: 1, minXP: 0, maxXP: 99, tokenReward: 10 },
  { level: 2, minXP: 100, maxXP: 199, tokenReward: 25 },
  { level: 3, minXP: 200, maxXP: 299, tokenReward: 50 },
  { level: 4, minXP: 300, maxXP: 499, tokenReward: 100 },
  { level: 5, minXP: 500, maxXP: 999, tokenReward: 200 },
] as const;

// Default token allocation for new users
export const DEFAULT_TOKENS = 50;

// XP event types and points
export const XP_EVENTS = {
  FIRST_NOTE: 10,
  DAILY_LOGIN: 5,
  REFERRAL_SIGNUP: 25,
  REFERRAL_ACTIVATION: 15,
  FEEDBACK_SUBMISSION: 10,
  VIDEO_WATCHED: 2,
  NOTE_CREATED: 3,
} as const;

export function calculateXPLevel(xp: number): { level: number; nextLevelAt: number } {
  const level = XP_LEVELS.find(l => xp >= l.minXP && xp <= l.maxXP) || XP_LEVELS[0];
  const nextLevel = XP_LEVELS.find(l => l.level === level.level + 1);
  return {
    level: level.level,
    nextLevelAt: nextLevel?.minXP || level.maxXP + 1
  };
}

export function getTokensFromXP(xp: number): number {
  let totalTokens = 0;
  for (const level of XP_LEVELS) {
    if (xp >= level.minXP) {
      totalTokens += level.tokenReward;
    }
  }
  return totalTokens;
}

export function canAffordAction(currentTokens: number, action: keyof typeof TOKEN_COSTS): boolean {
  return currentTokens >= TOKEN_COSTS[action];
}

export function getActionCost(action: keyof typeof TOKEN_COSTS): number {
  return TOKEN_COSTS[action];
}
