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

// User credits schema
const UserCreditsSchema = new mongoose.Schema({
  userId: { type: String, required: true, unique: true },
  credits: { type: Number, default: 100 }, // Free tier starts with 100 credits
  subscriptionTier: { 
    type: String, 
    enum: ['free', 'pro'], 
    default: 'free' 
  },
  monthlyCredits: { type: Number, default: 100 },
  creditsUsed: { type: Number, default: 0 },
  lastReset: { type: Date, default: Date.now },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Credit usage log schema
const CreditUsageSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  action: { 
    type: String, 
    enum: ['video_processing', 'question', 'note_generation', 'ocr', 'share'],
    required: true 
  },
  creditsUsed: { type: Number, required: true },
  videoId: { type: String, default: '' },
  metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  timestamp: { type: Date, default: Date.now }
});

const UserCredits = mongoose.models.UserCredits || mongoose.model('UserCredits', UserCreditsSchema);
const CreditUsage = mongoose.models.CreditUsage || mongoose.model('CreditUsage', CreditUsageSchema);

// In-memory storage for development
const inMemoryCreditsStorage = new Map();
const inMemoryUsageStorage = new Map();

// Credit costs configuration
const CREDIT_COSTS = {
  video_processing: 50,
  question: 5,
  note_generation: 10,
  ocr: 3,
  share: 2
};

// Get or create user credits
async function getUserCredits(userId: string) {
  let userCredits;
  
  if (process.env.MONGODB_URI && mongoose.connections[0].readyState) {
    userCredits = await UserCredits.findOne({ userId });
    
    if (!userCredits) {
      userCredits = new UserCredits({
        userId,
        credits: 100,
        subscriptionTier: 'free',
        monthlyCredits: 100
      });
      await userCredits.save();
    }
  } else {
    // Use in-memory storage for development
    userCredits = inMemoryCreditsStorage.get(userId);
    
    if (!userCredits) {
      userCredits = {
        userId,
        credits: 100,
        subscriptionTier: 'free',
        monthlyCredits: 100,
        creditsUsed: 0,
        lastReset: new Date(),
        createdAt: new Date(),
        updatedAt: new Date()
      };
      inMemoryCreditsStorage.set(userId, userCredits);
    }
  }
  
  return userCredits;
}

// Check if user has enough credits
async function hasEnoughCredits(userId: string, action: string): Promise<boolean> {
  const userCredits = await getUserCredits(userId);
  const cost = CREDIT_COSTS[action as keyof typeof CREDIT_COSTS] || 0;
  
  return userCredits.credits >= cost;
}

// Deduct credits from user
async function deductCredits(userId: string, action: string, metadata: any = {}): Promise<boolean> {
  const userCredits = await getUserCredits(userId);
  const cost = CREDIT_COSTS[action as keyof typeof CREDIT_COSTS] || 0;
  
  if (userCredits.credits < cost) {
    return false;
  }
  
  // Deduct credits
  userCredits.credits -= cost;
  userCredits.creditsUsed += cost;
  userCredits.updatedAt = new Date();
  
  // Save credits
  if (process.env.MONGODB_URI && mongoose.connections[0].readyState) {
    await userCredits.save();
  } else {
    inMemoryCreditsStorage.set(userId, userCredits);
  }
  
  // Log usage
  const usageLog = {
    userId,
    action,
    creditsUsed: cost,
    videoId: metadata.videoId || '',
    metadata,
    timestamp: new Date()
  };
  
  if (process.env.MONGODB_URI && mongoose.connections[0].readyState) {
    const usage = new CreditUsage(usageLog);
    await usage.save();
  } else {
    const usageId = `${userId}_${Date.now()}_${Math.random()}`;
    inMemoryUsageStorage.set(usageId, usageLog);
  }
  
  return true;
}

// Add credits to user (for purchases or rewards)
async function addCredits(userId: string, amount: number, reason: string = 'purchase'): Promise<void> {
  const userCredits = await getUserCredits(userId);
  
  userCredits.credits += amount;
  userCredits.updatedAt = new Date();
  
  // Save credits
  if (process.env.MONGODB_URI && mongoose.connections[0].readyState) {
    await userCredits.save();
  } else {
    inMemoryCreditsStorage.set(userId, userCredits);
  }
  
  // Log credit addition
  const usageLog = {
    userId,
    action: 'credit_purchase' as any,
    creditsUsed: -amount, // Negative for addition
    videoId: '',
    metadata: { reason, amount },
    timestamp: new Date()
  };
  
  if (process.env.MONGODB_URI && mongoose.connections[0].readyState) {
    const usage = new CreditUsage(usageLog);
    await usage.save();
  } else {
    const usageId = `${userId}_${Date.now()}_${Math.random()}`;
    inMemoryUsageStorage.set(usageId, usageLog);
  }
}

// GET - Get user's credit balance and usage
export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth();
    const { searchParams } = new URL(request.url);
    const includeUsage = searchParams.get('includeUsage') === 'true';
    
    if (process.env.MONGODB_URI) {
      await connectDB();
    }
    
    const userCredits = await getUserCredits(auth.id);
    
    let usageHistory = [];
    if (includeUsage) {
      if (process.env.MONGODB_URI && mongoose.connections[0].readyState) {
        usageHistory = await CreditUsage.find({ userId: auth.id })
          .sort({ timestamp: -1 })
          .limit(50);
      } else {
        usageHistory = Array.from(inMemoryUsageStorage.values())
          .filter(usage => usage.userId === auth.id)
          .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
          .slice(0, 50);
      }
    }
    
    return NextResponse.json({
      success: true,
      credits: {
        balance: userCredits.credits,
        subscriptionTier: userCredits.subscriptionTier,
        monthlyCredits: userCredits.monthlyCredits,
        creditsUsed: userCredits.creditsUsed,
        lastReset: userCredits.lastReset,
        costs: CREDIT_COSTS
      },
      usage: includeUsage ? usageHistory.map(usage => ({
        action: usage.action,
        creditsUsed: usage.creditsUsed,
        videoId: usage.videoId,
        metadata: usage.metadata,
        timestamp: usage.timestamp
      })) : []
    });
    
  } catch (error) {
    console.error('Credits retrieval error:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve credits' },
      { status: 500 }
    );
  }
}

// POST - Purchase credits or upgrade subscription
export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth();
    const { 
      action, 
      amount, 
      subscriptionTier, 
      stripeSessionId 
    } = await request.json();
    
    if (process.env.MONGODB_URI) {
      await connectDB();
    }
    
    const userCredits = await getUserCredits(auth.id);
    
    if (action === 'purchase_credits') {
      if (!amount || amount <= 0) {
        return NextResponse.json({ 
          error: 'Invalid credit amount' 
        }, { status: 400 });
      }
      
      await addCredits(auth.id, amount, 'credit_purchase');
      
      return NextResponse.json({
        success: true,
        message: `Successfully added ${amount} credits`,
        newBalance: userCredits.credits + amount
      });
      
    } else if (action === 'upgrade_subscription') {
      if (!subscriptionTier || !['pro'].includes(subscriptionTier)) {
        return NextResponse.json({ 
          error: 'Invalid subscription tier' 
        }, { status: 400 });
      }
      
      // Update subscription tier
      userCredits.subscriptionTier = subscriptionTier;
      userCredits.monthlyCredits = subscriptionTier === 'pro' ? 1000 : 100;
      userCredits.updatedAt = new Date();
      
      if (process.env.MONGODB_URI && mongoose.connections[0].readyState) {
        await userCredits.save();
      } else {
        inMemoryCreditsStorage.set(auth.id, userCredits);
      }
      
      return NextResponse.json({
        success: true,
        message: 'Subscription upgraded successfully',
        subscriptionTier: userCredits.subscriptionTier,
        monthlyCredits: userCredits.monthlyCredits
      });
      
    } else if (action === 'reset_monthly') {
      // Reset monthly credits (called by cron job)
      const now = new Date();
      const lastReset = new Date(userCredits.lastReset);
      const monthsSinceReset = (now.getFullYear() - lastReset.getFullYear()) * 12 + (now.getMonth() - lastReset.getMonth());
      
      if (monthsSinceReset >= 1) {
        userCredits.credits = userCredits.monthlyCredits;
        userCredits.creditsUsed = 0;
        userCredits.lastReset = now;
        userCredits.updatedAt = now;
        
        if (process.env.MONGODB_URI && mongoose.connections[0].readyState) {
          await userCredits.save();
        } else {
          inMemoryCreditsStorage.set(auth.id, userCredits);
        }
        
        return NextResponse.json({
          success: true,
          message: 'Monthly credits reset successfully',
          newBalance: userCredits.credits
        });
      } else {
        return NextResponse.json({
          success: true,
          message: 'Monthly credits already reset this month',
          currentBalance: userCredits.credits
        });
      }
    }
    
    return NextResponse.json({ 
      error: 'Invalid action' 
    }, { status: 400 });
    
  } catch (error) {
    console.error('Credits update error:', error);
    return NextResponse.json(
      { error: 'Failed to update credits' },
      { status: 500 }
    );
  }
}

// PUT - Update credits (for admin use)
export async function PUT(request: NextRequest) {
  try {
    const auth = await requireAuth();
    const { 
      userId, 
      credits, 
      subscriptionTier, 
      reason 
    } = await request.json();
    
    // Check if user is admin (you might want to implement proper admin check)
    if (!userId || userId !== auth.id) {
      return NextResponse.json({ 
        error: 'Unauthorized' 
      }, { status: 403 });
    }
    
    if (process.env.MONGODB_URI) {
      await connectDB();
    }
    
    const userCredits = await getUserCredits(userId);
    
    if (credits !== undefined) {
      const difference = credits - userCredits.credits;
      userCredits.credits = credits;
      userCredits.updatedAt = new Date();
      
      if (process.env.MONGODB_URI && mongoose.connections[0].readyState) {
        await userCredits.save();
      } else {
        inMemoryCreditsStorage.set(userId, userCredits);
      }
      
      // Log the change
      if (difference !== 0) {
        const usageLog = {
          userId,
          action: 'admin_adjustment' as any,
          creditsUsed: -difference,
          videoId: '',
          metadata: { reason, adminId: auth.id },
          timestamp: new Date()
        };
        
        if (process.env.MONGODB_URI && mongoose.connections[0].readyState) {
          const usage = new CreditUsage(usageLog);
          await usage.save();
        } else {
          const usageId = `${userId}_${Date.now()}_${Math.random()}`;
          inMemoryUsageStorage.set(usageId, usageLog);
        }
      }
    }
    
    if (subscriptionTier) {
      userCredits.subscriptionTier = subscriptionTier;
      userCredits.monthlyCredits = subscriptionTier === 'pro' ? 1000 : 100;
      userCredits.updatedAt = new Date();
      
      if (process.env.MONGODB_URI && mongoose.connections[0].readyState) {
        await userCredits.save();
      } else {
        inMemoryCreditsStorage.set(userId, userCredits);
      }
    }
    
    return NextResponse.json({
      success: true,
      message: 'Credits updated successfully',
      credits: {
        balance: userCredits.credits,
        subscriptionTier: userCredits.subscriptionTier,
        monthlyCredits: userCredits.monthlyCredits
      }
    });
    
  } catch (error) {
    console.error('Credits update error:', error);
    return NextResponse.json(
      { error: 'Failed to update credits' },
      { status: 500 }
    );
  }
}

