// Usage limiting system for ChatPye
export interface UserUsage {
  userId: string;
  planType: 'free' | 'pro';
  monthlyQuestions: number;
  monthlyVideosProcessed: number;
  usageResetDate: Date;
}

export interface UsageLimits {
  free: {
    monthlyQuestions: number;
    monthlyVideosProcessed: number;
  };
  pro: {
    monthlyQuestions: number; // High number for "unlimited"
    monthlyVideosProcessed: number;
  };
}

export const USAGE_LIMITS: UsageLimits = {
  free: {
    monthlyQuestions: 50, // 50 questions per video/month
    monthlyVideosProcessed: 2 // 2 videos per month
  },
  pro: {
    monthlyQuestions: 10000, // Effectively unlimited
    monthlyVideosProcessed: 100 // 100 videos per month
  }
};

export interface UsageCheckResult {
  allowed: boolean;
  reason?: string;
  remainingQuestions?: number;
  remainingVideos?: number;
}

// Check if user can perform an action
export function checkUsageLimit(
  userUsage: UserUsage,
  action: 'question' | 'video'
): UsageCheckResult {
  const limits = USAGE_LIMITS[userUsage.planType];
  
  // Check if usage needs to be reset (monthly)
  const now = new Date();
  const daysSinceReset = Math.floor(
    (now.getTime() - userUsage.usageResetDate.getTime()) / (1000 * 60 * 60 * 24)
  );
  
  if (daysSinceReset >= 30) {
    // Reset usage for new month
    userUsage.monthlyQuestions = 0;
    userUsage.monthlyVideosProcessed = 0;
    userUsage.usageResetDate = now;
  }

  if (action === 'question') {
    if (userUsage.monthlyQuestions >= limits.monthlyQuestions) {
      return {
        allowed: false,
        reason: `You have reached your monthly question limit of ${limits.monthlyQuestions}. Please upgrade to Pro for unlimited questions.`,
        remainingQuestions: 0
      };
    }
    
    return {
      allowed: true,
      remainingQuestions: limits.monthlyQuestions - userUsage.monthlyQuestions
    };
  }

  if (action === 'video') {
    if (userUsage.monthlyVideosProcessed >= limits.monthlyVideosProcessed) {
      return {
        allowed: false,
        reason: `You have reached your monthly video processing limit of ${limits.monthlyVideosProcessed}. Please upgrade to Pro for more videos.`,
        remainingVideos: 0
      };
    }
    
    return {
      allowed: true,
      remainingVideos: limits.monthlyVideosProcessed - userUsage.monthlyVideosProcessed
    };
  }

  return { allowed: true };
}

// Increment usage after successful action
export function incrementUsage(
  userUsage: UserUsage,
  action: 'question' | 'video'
): UserUsage {
  const updatedUsage = { ...userUsage };
  
  if (action === 'question') {
    updatedUsage.monthlyQuestions += 1;
  } else if (action === 'video') {
    updatedUsage.monthlyVideosProcessed += 1;
  }
  
  return updatedUsage;
}

// Get user's current usage status
export function getUserUsageStatus(userUsage: UserUsage) {
  const limits = USAGE_LIMITS[userUsage.planType];
  
  return {
    planType: userUsage.planType,
    questionsUsed: userUsage.monthlyQuestions,
    questionsLimit: limits.monthlyQuestions,
    questionsRemaining: limits.monthlyQuestions - userUsage.monthlyQuestions,
    videosUsed: userUsage.monthlyVideosProcessed,
    videosLimit: limits.monthlyVideosProcessed,
    videosRemaining: limits.monthlyVideosProcessed - userUsage.monthlyVideosProcessed,
    usageResetDate: userUsage.usageResetDate,
    isUnlimited: userUsage.planType === 'pro'
  };
}
