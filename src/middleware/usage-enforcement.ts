import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { checkUsageLimit, incrementUsage, UserUsage } from '@/lib/usage-limits';

// Mock user data storage (in production, this would be a database)
const userUsageStorage = new Map<string, UserUsage>();

// Initialize user usage data
function initializeUserUsage(userId: string, planType: 'free' | 'pro' = 'free'): UserUsage {
  const userUsage: UserUsage = {
    userId,
    planType,
    monthlyQuestions: 0,
    monthlyVideosProcessed: 0,
    usageResetDate: new Date()
  };
  
  userUsageStorage.set(userId, userUsage);
  return userUsage;
}

// Get user usage data
function getUserUsage(userId: string): UserUsage {
  let userUsage = userUsageStorage.get(userId);
  
  if (!userUsage) {
    userUsage = initializeUserUsage(userId);
  }
  
  return userUsage;
}

// Update user usage data
function updateUserUsage(userUsage: UserUsage): void {
  userUsageStorage.set(userUsage.userId, userUsage);
}

// Usage enforcement middleware
export function createUsageEnforcementMiddleware(action: 'question' | 'video') {
  return async function usageEnforcementMiddleware(
    request: NextRequest,
    response: NextResponse
  ): Promise<NextResponse> {
    try {
      // Get user from Clerk auth
      const { userId } = await auth();
      
      if (!userId) {
        return NextResponse.json(
          { error: 'Authentication required' },
          { status: 401 }
        );
      }

      // Get user usage data
      const userUsage = getUserUsage(userId);
      
      // Check usage limits
      const usageCheck = checkUsageLimit(userUsage, action);
      
      if (!usageCheck.allowed) {
        return NextResponse.json(
          { 
            error: 'Usage limit exceeded',
            message: usageCheck.reason,
            remaining: action === 'question' ? usageCheck.remainingQuestions : usageCheck.remainingVideos
          },
          { status: 429 }
        );
      }

      // Add usage info to response headers
      const responseHeaders = new Headers(response.headers);
      responseHeaders.set('x-usage-remaining-questions', usageCheck.remainingQuestions?.toString() || '0');
      responseHeaders.set('x-usage-remaining-videos', usageCheck.remainingVideos?.toString() || '0');
      responseHeaders.set('x-user-plan', userUsage.planType);

      return new NextResponse(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: responseHeaders
      });
    } catch (error) {
      console.error('Usage enforcement error:', error);
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      );
    }
  };
}

// Post-action usage increment
export async function incrementUserUsage(
  userId: string,
  action: 'question' | 'video'
): Promise<void> {
  try {
    const userUsage = getUserUsage(userId);
    const updatedUsage = incrementUsage(userUsage, action);
    updateUserUsage(updatedUsage);
  } catch (error) {
    console.error('Error incrementing usage:', error);
  }
}

// Get user usage status
export async function getUserUsageStatus(userId: string) {
  try {
    const userUsage = getUserUsage(userId);
    return {
      planType: userUsage.planType,
      monthlyQuestions: userUsage.monthlyQuestions,
      monthlyVideosProcessed: userUsage.monthlyVideosProcessed,
      usageResetDate: userUsage.usageResetDate
    };
  } catch (error) {
    console.error('Error getting user usage status:', error);
    return null;
  }
}

// Update user plan (for when they upgrade)
export async function updateUserPlan(userId: string, planType: 'free' | 'pro'): Promise<void> {
  try {
    const userUsage = getUserUsage(userId);
    userUsage.planType = planType;
    updateUserUsage(userUsage);
  } catch (error) {
    console.error('Error updating user plan:', error);
  }
}
