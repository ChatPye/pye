import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import mongoose from 'mongoose';

// DocumentDB connection
const connectDB = async () => {
  if (mongoose.connections[0].readyState) return;
  
  if (!process.env.MONGODB_URI && !process.env.DOCUMENTDB_URI && process.env.NODE_ENV === 'development') {
    console.log('No database configured, using in-memory storage for development');
    return;
  }
  
  try {
    await mongoose.connect(
      process.env.MONGODB_URI || process.env.DOCUMENTDB_URI || 'mongodb://localhost:27017/chatpye'
    );
  } catch (error) {
    console.error('Database connection failed:', error);
    if (process.env.NODE_ENV === 'development') {
      console.log('Falling back to in-memory storage for development');
    } else {
      throw error;
    }
  }
};

// Usage tracking schema
const UsageTrackingSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  month: { type: String, required: true }, // YYYY-MM format
  videosProcessed: { type: Number, default: 0 },
  questionsAsked: { type: Number, default: 0 },
  notesCreated: { type: Number, default: 0 },
  bookmarksCreated: { type: Number, default: 0 },
  lastReset: { type: Date, default: Date.now },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

const UsageTracking = mongoose.models.UsageTracking || mongoose.model('UsageTracking', UsageTrackingSchema);

// In-memory storage for development
const inMemoryUsageStorage = new Map();

// Free tier limits
const FREE_TIER_LIMITS = {
  videosPerMonth: 2,
  questionsPerMonth: 20,
  notesPerMonth: 10,
  bookmarksPerMonth: 50
};

// Enterprise tenant fair-use limits (applied at tenant scope, not user scope)
const ENTERPRISE_LIMITS = {
  videosPerDayTenant: 1000,
  questionsPerMinuteTenant: 500,
};

// In-memory tenant counters for dev (date/minute windows)
const tenantDailyVideos = new Map<string, { day: string; count: number }>();
const tenantMinuteQuestions = new Map<string, { minute: string; count: number }>();

function getDayKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${(d.getMonth()+1).toString().padStart(2,'0')}-${d.getDate().toString().padStart(2,'0')}`;
}
function getMinuteKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${(d.getMonth()+1)}-${d.getDate()} ${d.getHours()}:${d.getMinutes()}`;
}

// Get current month in YYYY-MM format
function getCurrentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}`;
}

// Get or create usage tracking for user
async function getUserUsage(userId: string) {
  const currentMonth = getCurrentMonth();
  
  let usage;
  if (process.env.MONGODB_URI && mongoose.connections[0].readyState) {
    usage = await UsageTracking.findOne({ userId, month: currentMonth });
    
    if (!usage) {
      usage = new UsageTracking({
        userId,
        month: currentMonth
      });
      await usage.save();
    }
  } else {
    // Use in-memory storage for development
    const key = `${userId}_${currentMonth}`;
    usage = inMemoryUsageStorage.get(key);
    
    if (!usage) {
      usage = {
        userId,
        month: currentMonth,
        videosProcessed: 0,
        questionsAsked: 0,
        notesCreated: 0,
        bookmarksCreated: 0,
        lastReset: new Date(),
        createdAt: new Date(),
        updatedAt: new Date()
      };
      inMemoryUsageStorage.set(key, usage);
    }
  }
  
  return usage;
}

// Check if user has hit paywall
async function checkPaywall(userId: string, action: string, opts?: { tenantId?: string; tenantPlan?: string }): Promise<{ blocked: boolean; reason?: string }> {
  try {
    // Enterprise override: if tenantPlan=enterprise, relax personal limits and apply tenant FUP
    if (opts?.tenantPlan === 'enterprise' && opts?.tenantId) {
      const tId = opts.tenantId;
      if (action === 'video_processing') {
        const day = getDayKey();
        const rec = tenantDailyVideos.get(tId);
        const count = rec && rec.day === day ? rec.count : 0;
        if (count >= ENTERPRISE_LIMITS.videosPerDayTenant) {
          return { blocked: true, reason: 'Tenant daily video processing fair-use limit reached. Try later.' };
        }
        return { blocked: false };
      }
      if (action === 'question') {
        const minute = getMinuteKey();
        const rec = tenantMinuteQuestions.get(tId);
        const count = rec && rec.minute === minute ? rec.count : 0;
        if (count >= ENTERPRISE_LIMITS.questionsPerMinuteTenant) {
          return { blocked: true, reason: 'Tenant per-minute question fair-use limit reached. Try again shortly.' };
        }
        return { blocked: false };
      }
      // Notes/bookmarks unrestricted for enterprise by default
      return { blocked: false };
    }

    const usage = await getUserUsage(userId);
    
    switch (action) {
      case 'video_processing':
        if (usage.videosProcessed >= FREE_TIER_LIMITS.videosPerMonth) {
          return {
            blocked: true,
            reason: `You've reached your monthly limit of ${FREE_TIER_LIMITS.videosPerMonth} videos. Upgrade to Pro for unlimited video processing.`
          };
        }
        break;
        
      case 'question':
        if (usage.questionsAsked >= FREE_TIER_LIMITS.questionsPerMonth) {
          return {
            blocked: true,
            reason: `You've reached your monthly limit of ${FREE_TIER_LIMITS.questionsPerMonth} questions. Upgrade to Pro for unlimited questions.`
          };
        }
        break;
        
      case 'note_creation':
        if (usage.notesCreated >= FREE_TIER_LIMITS.notesPerMonth) {
          return {
            blocked: true,
            reason: `You've reached your monthly limit of ${FREE_TIER_LIMITS.notesPerMonth} notes. Upgrade to Pro for unlimited notes.`
          };
        }
        break;
        
      case 'bookmark_creation':
        if (usage.bookmarksCreated >= FREE_TIER_LIMITS.bookmarksPerMonth) {
          return {
            blocked: true,
            reason: `You've reached your monthly limit of ${FREE_TIER_LIMITS.bookmarksPerMonth} bookmarks. Upgrade to Pro for unlimited bookmarks.`
          };
        }
        break;
    }
    
    return { blocked: false };
  } catch (error) {
    console.error('Error checking paywall:', error);
    return { blocked: false }; // Allow action on error
  }
}

// Increment usage
async function incrementUsage(userId: string, action: string, opts?: { tenantId?: string; tenantPlan?: string }): Promise<void> {
  try {
    // Enterprise tenant counters
    if (opts?.tenantPlan === 'enterprise' && opts?.tenantId) {
      const tId = opts.tenantId;
      if (action === 'video_processing') {
        const day = getDayKey();
        const rec = tenantDailyVideos.get(tId);
        const next = (!rec || rec.day !== day) ? { day, count: 1 } : { day, count: rec.count + 1 };
        tenantDailyVideos.set(tId, next);
        return;
      }
      if (action === 'question') {
        const minute = getMinuteKey();
        const rec = tenantMinuteQuestions.get(tId);
        const next = (!rec || rec.minute !== minute) ? { minute, count: 1 } : { minute, count: rec.count + 1 };
        tenantMinuteQuestions.set(tId, next);
        return;
      }
      // No counters for notes/bookmarks under enterprise
      return;
    }

    const usage = await getUserUsage(userId);
    
    switch (action) {
      case 'video_processing':
        usage.videosProcessed += 1;
        break;
      case 'question':
        usage.questionsAsked += 1;
        break;
      case 'note_creation':
        usage.notesCreated += 1;
        break;
      case 'bookmark_creation':
        usage.bookmarksCreated += 1;
        break;
    }
    
    usage.updatedAt = new Date();
    
    if (process.env.MONGODB_URI && mongoose.connections[0].readyState) {
      await usage.save();
    } else {
      const key = `${userId}_${usage.month}`;
      inMemoryUsageStorage.set(key, usage);
    }
  } catch (error) {
    console.error('Error incrementing usage:', error);
  }
}

// GET - Check paywall status
export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth();
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');
    const tenantPlan = searchParams.get('tenantPlan') || undefined;
    const tenantId = searchParams.get('tenantId') || undefined;
    
    if (process.env.MONGODB_URI) {
      await connectDB();
    }
    
    const usage = await getUserUsage(auth.id);
    
    if (action) {
      const paywallCheck = await checkPaywall(auth.id, action, { tenantId, tenantPlan });
      return NextResponse.json({
        success: true,
        blocked: paywallCheck.blocked,
        reason: paywallCheck.reason,
        usage: {
          videosProcessed: usage.videosProcessed,
          questionsAsked: usage.questionsAsked,
          notesCreated: usage.notesCreated,
          bookmarksCreated: usage.bookmarksCreated,
          limits: FREE_TIER_LIMITS
        }
      });
    }
    
    return NextResponse.json({
      success: true,
      usage: {
        videosProcessed: usage.videosProcessed,
        questionsAsked: usage.questionsAsked,
        notesCreated: usage.notesCreated,
        bookmarksCreated: usage.bookmarksCreated,
        limits: FREE_TIER_LIMITS,
        month: usage.month
      }
    });
    
  } catch (error) {
    console.error('Paywall check error:', error);
    return NextResponse.json(
      { error: 'Failed to check paywall status' },
      { status: 500 }
    );
  }
}

// POST - Increment usage
export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth();
    const { action, tenantId, tenantPlan } = await request.json();
    
    if (!action) {
      return NextResponse.json({ 
        error: 'Action is required' 
      }, { status: 400 });
    }
    
    if (process.env.MONGODB_URI) {
      await connectDB();
    }
    
    // Check paywall first
    const paywallCheck = await checkPaywall(auth.id, action, { tenantId, tenantPlan });
    
    if (paywallCheck.blocked) {
      return NextResponse.json({
        success: false,
        blocked: true,
        reason: paywallCheck.reason,
        upgradeUrl: `${process.env.NEXT_PUBLIC_BASE_URL || 'https://chatpye.com'}/billing?upgrade=pro`
      });
    }
    
    // Increment usage
    await incrementUsage(auth.id, action, { tenantId, tenantPlan });
    
    // Get updated usage
    const usage = await getUserUsage(auth.id);
    
    return NextResponse.json({
      success: true,
      blocked: false,
      usage: {
        videosProcessed: usage.videosProcessed,
        questionsAsked: usage.questionsAsked,
        notesCreated: usage.notesCreated,
        bookmarksCreated: usage.bookmarksCreated,
        limits: FREE_TIER_LIMITS
      }
    });
    
  } catch (error) {
    console.error('Usage increment error:', error);
    return NextResponse.json(
      { error: 'Failed to increment usage' },
      { status: 500 }
    );
  }
}

