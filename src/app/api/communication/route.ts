import { NextRequest, NextResponse } from 'next/server';

// Configure for static export
export const dynamic = 'force-static';
export const revalidate = false;

// Communication materials for different user segments
const COMMUNICATION_MATERIALS = {
  // For new users who haven't installed the extension
  onboarding: {
    email1: {
      subject: "Welcome to ChatPye! Let's get you started 🚀",
      template: "welcome-email",
      delay: 0, // Immediate
      segment: "new_users"
    },
    email2: {
      subject: "Don't forget to install the ChatPye extension",
      template: "extension-reminder",
      delay: 24, // 24 hours
      segment: "new_users_no_extension"
    },
    email3: {
      subject: "Your first AI-powered note is just one click away",
      template: "first-note-encouragement",
      delay: 72, // 3 days
      segment: "new_users_no_activity"
    }
  },
  
  // For free users to convert to paid
  conversion: {
    email1: {
      subject: "Unlock the full power of ChatPye with Pro features",
      template: "upgrade-reminder",
      delay: 7, // 7 days after signup
      segment: "free_users"
    },
    email2: {
      subject: "You've used 80% of your free tokens - Upgrade now!",
      template: "token-limit-warning",
      delay: 0, // Triggered by usage
      segment: "free_users_high_usage"
    },
    email3: {
      subject: "Limited time: 50% off your first month of Pro",
      template: "discount-offer",
      delay: 14, // 14 days
      segment: "free_users_no_upgrade"
    }
  },
  
  // For power users to maximize engagement
  engagement: {
    email1: {
      subject: "Pro tip: How to create better notes with AI",
      template: "pro-tips",
      delay: 10, // 10 days
      segment: "active_users"
    },
    email2: {
      subject: "New feature: Smart bookmarks are here!",
      template: "feature-announcement",
      delay: 0, // Triggered by feature release
      segment: "all_users"
    },
    email3: {
      subject: "Your learning insights: See how much you've learned",
      template: "progress-report",
      delay: 30, // Monthly
      segment: "active_users"
    }
  },
  
  // For churned users to re-engage
  reengagement: {
    email1: {
      subject: "We miss you! Here's what's new in ChatPye",
      template: "win-back",
      delay: 7, // 7 days after last activity
      segment: "inactive_users"
    },
    email2: {
      subject: "Your notes are waiting for you",
      template: "notes-reminder",
      delay: 14, // 14 days
      segment: "inactive_users"
    },
    email3: {
      subject: "Last chance: 60% off to come back to ChatPye",
      template: "final-offer",
      delay: 30, // 30 days
      segment: "churned_users"
    }
  }
};

// User segments based on behavior
const USER_SEGMENTS = {
  new_users: {
    criteria: "created_at > now() - interval '7 days'",
    description: "Users who signed up in the last 7 days"
  },
  new_users_no_extension: {
    criteria: "created_at > now() - interval '7 days' AND extension_installed = false",
    description: "New users who haven't installed the extension"
  },
  new_users_no_activity: {
    criteria: "created_at > now() - interval '7 days' AND notes_count = 0",
    description: "New users who haven't created any notes"
  },
  free_users: {
    criteria: "subscription_plan = 'free' AND created_at < now() - interval '7 days'",
    description: "Free users who have been using the service for a week"
  },
  free_users_high_usage: {
    criteria: "subscription_plan = 'free' AND tokens_used > (tokens_allocated * 0.8)",
    description: "Free users who have used 80% of their tokens"
  },
  free_users_no_upgrade: {
    criteria: "subscription_plan = 'free' AND created_at < now() - interval '14 days'",
    description: "Free users who haven't upgraded after 2 weeks"
  },
  active_users: {
    criteria: "notes_count > 10 AND last_activity > now() - interval '7 days'",
    description: "Users who are actively using the service"
  },
  inactive_users: {
    criteria: "last_activity < now() - interval '7 days' AND last_activity > now() - interval '30 days'",
    description: "Users who haven't been active for a week but less than a month"
  },
  churned_users: {
    criteria: "last_activity < now() - interval '30 days'",
    description: "Users who haven't been active for over a month"
  }
};

// Analytics tracking for communication effectiveness
const ANALYTICS_METRICS = {
  open_rate: "Percentage of emails opened",
  click_rate: "Percentage of emails with clicks",
  conversion_rate: "Percentage of emails leading to desired action",
  unsubscribe_rate: "Percentage of users who unsubscribe",
  revenue_attribution: "Revenue generated from email campaigns"
};

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    switch (action) {
      case 'materials':
        return NextResponse.json({
          success: true,
          data: COMMUNICATION_MATERIALS
        });

      case 'segments':
        return NextResponse.json({
          success: true,
          data: USER_SEGMENTS
        });

      case 'analytics':
        return NextResponse.json({
          success: true,
          data: ANALYTICS_METRICS
        });

      default:
        return NextResponse.json({
          success: true,
          data: {
            materials: COMMUNICATION_MATERIALS,
            segments: USER_SEGMENTS,
            analytics: ANALYTICS_METRICS
          }
        });
    }
  } catch (error) {
    console.error('Error fetching communication data:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch communication data' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, segment, template, data } = body;

    switch (action) {
      case 'send_campaign':
        // Send email campaign to specific segment
        const result = await sendEmailCampaign(segment, template, data);
        return NextResponse.json({
          success: true,
          data: result
        });

      case 'track_event':
        // Track email engagement events
        await trackEmailEvent(data);
        return NextResponse.json({
          success: true,
          message: 'Event tracked successfully'
        });

      case 'update_segment':
        // Update user segment based on behavior
        await updateUserSegment(data.userId, data.segment);
        return NextResponse.json({
          success: true,
          message: 'User segment updated'
        });

      default:
        return NextResponse.json(
          { success: false, error: 'Invalid action' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Error processing communication request:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to process request' },
      { status: 500 }
    );
  }
}

// Helper functions
async function sendEmailCampaign(segment: string, template: string, data: any) {
  // This would integrate with your email service (MailerLite, SendGrid, etc.)
  console.log(`Sending ${template} to ${segment} segment`, data);
  
  // Simulate email sending
  return {
    campaignId: `campaign_${Date.now()}`,
    segment,
    template,
    recipients: 1000, // This would be the actual count from your database
    sentAt: new Date().toISOString()
  };
}

async function trackEmailEvent(data: any) {
  // This would track email engagement in your analytics system
  console.log('Tracking email event:', data);
  
  // Track in PostHog, Google Analytics, or your preferred analytics
  if (typeof window !== 'undefined' && window.posthog) {
    window.posthog.capture('email_engagement', data);
  }
}

async function updateUserSegment(userId: string, segment: string) {
  // This would update the user's segment in your database
  console.log(`Updating user ${userId} to segment ${segment}`);
  
  // Update user record with new segment
  // This would be a database operation
}
