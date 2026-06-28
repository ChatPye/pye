import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import mongoose from 'mongoose';

// Force dynamic rendering for API routes
export const dynamic = 'force-dynamic';

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

// Referral schema
const ReferralSchema = new mongoose.Schema({
  referrerId: { type: String, required: true },
  refereeId: { type: String, required: true },
  referralCode: { type: String, required: true },
  status: { 
    type: String, 
    enum: ['pending', 'completed', 'rewarded'], 
    default: 'pending' 
  },
  rewardType: { 
    type: String, 
    enum: ['credits', 'xp', 'both'], 
    default: 'both' 
  },
  referrerReward: {
    credits: { type: Number, default: 0 },
    xp: { type: Number, default: 0 }
  },
  refereeReward: {
    credits: { type: Number, default: 0 },
    xp: { type: Number, default: 0 }
  },
  createdAt: { type: Date, default: Date.now },
  completedAt: { type: Date, default: null },
  rewardedAt: { type: Date, default: null },
  metadata: {
    source: { type: String, default: 'extension' },
    userAgent: { type: String, default: '' },
    ipAddress: { type: String, default: '' }
  }
});

// User referral code schema
const UserReferralCodeSchema = new mongoose.Schema({
  userId: { type: String, required: true, unique: true },
  referralCode: { type: String, required: true, unique: true },
  totalReferrals: { type: Number, default: 0 },
  completedReferrals: { type: Number, default: 0 },
  totalRewards: {
    credits: { type: Number, default: 0 },
    xp: { type: Number, default: 0 }
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

const Referral = mongoose.models.Referral || mongoose.model('Referral', ReferralSchema);
const UserReferralCode = mongoose.models.UserReferralCode || mongoose.model('UserReferralCode', UserReferralCodeSchema);

// In-memory storage for development
const inMemoryReferralStorage = new Map();
const inMemoryReferralCodeStorage = new Map();

// Generate unique referral code
function generateReferralCode(userId: string): string {
  const prefix = userId.slice(-4).toUpperCase();
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `CHATPYE${prefix}${timestamp}${random}`;
}

// Referral rewards configuration
const REFERRAL_REWARDS = {
  referrer: {
    credits: 50,
    xp: 100
  },
  referee: {
    credits: 25,
    xp: 50
  }
};

// Get or create user referral code
async function getUserReferralCode(userId: string) {
  let userReferralCode;
  
  if (process.env.MONGODB_URI && mongoose.connections[0].readyState) {
    userReferralCode = await UserReferralCode.findOne({ userId });
    
    if (!userReferralCode) {
      const referralCode = generateReferralCode(userId);
      userReferralCode = new UserReferralCode({
        userId,
        referralCode
      });
      await userReferralCode.save();
    }
  } else {
    // Use in-memory storage for development
    userReferralCode = inMemoryReferralCodeStorage.get(userId);
    
    if (!userReferralCode) {
      const referralCode = generateReferralCode(userId);
      userReferralCode = {
        userId,
        referralCode,
        totalReferrals: 0,
        completedReferrals: 0,
        totalRewards: { credits: 0, xp: 0 },
        createdAt: new Date(),
        updatedAt: new Date()
      };
      inMemoryReferralCodeStorage.set(userId, userReferralCode);
    }
  }
  
  return userReferralCode;
}

// Process referral completion
async function processReferralCompletion(refereeId: string, referralCode: string) {
  try {
    if (process.env.MONGODB_URI) {
      await connectDB();
    }
    
    // Find the referrer by referral code
    let referrerCode;
    if (process.env.MONGODB_URI && mongoose.connections[0].readyState) {
      referrerCode = await UserReferralCode.findOne({ referralCode });
    } else {
      referrerCode = Array.from(inMemoryReferralCodeStorage.values())
        .find(code => code.referralCode === referralCode);
    }
    
    if (!referrerCode) {
      return { success: false, error: 'Invalid referral code' };
    }
    
    const referrerId = referrerCode.userId;
    
    // Check if referral already exists
    let existingReferral;
    if (process.env.MONGODB_URI && mongoose.connections[0].readyState) {
      existingReferral = await Referral.findOne({ 
        referrerId, 
        refereeId 
      });
    } else {
      existingReferral = Array.from(inMemoryReferralStorage.values())
        .find(ref => ref.referrerId === referrerId && ref.refereeId === refereeId);
    }
    
    if (existingReferral) {
      return { success: false, error: 'Referral already exists' };
    }
    
    // Create referral record
    const referralData = {
      referrerId,
      refereeId,
      referralCode,
      status: 'completed',
      rewardType: 'both',
      referrerReward: REFERRAL_REWARDS.referrer,
      refereeReward: REFERRAL_REWARDS.referee,
      completedAt: new Date(),
      metadata: {
        source: 'signup',
        userAgent: '',
        ipAddress: ''
      }
    };
    
    let referral;
    if (process.env.MONGODB_URI && mongoose.connections[0].readyState) {
      referral = new Referral(referralData);
      await referral.save();
    } else {
      const referralId = `${referrerId}_${refereeId}_${Date.now()}`;
      referral = { _id: referralId, ...referralData };
      inMemoryReferralStorage.set(referralId, referral);
    }
    
    // Update referrer's stats
    referrerCode.totalReferrals += 1;
    referrerCode.completedReferrals += 1;
    referrerCode.totalRewards.credits += REFERRAL_REWARDS.referrer.credits;
    referrerCode.totalRewards.xp += REFERRAL_REWARDS.referrer.xp;
    referrerCode.updatedAt = new Date();
    
    if (process.env.MONGODB_URI && mongoose.connections[0].readyState) {
      await referrerCode.save();
    } else {
      inMemoryReferralCodeStorage.set(referrerId, referrerCode);
    }
    
    // Award rewards
    try {
      // Award credits to referrer
      await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/credits`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action: 'purchase_credits',
          amount: REFERRAL_REWARDS.referrer.credits,
          userId: referrerId
        })
      });
      
      // Award XP to referrer
      await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/xp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action: 'referral',
          userId: referrerId,
          metadata: { refereeId, referralCode }
        })
      });
      
      // Award credits to referee
      await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/credits`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action: 'purchase_credits',
          amount: REFERRAL_REWARDS.referee.credits,
          userId: refereeId
        })
      });
      
      // Award XP to referee
      await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/xp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action: 'referral',
          userId: refereeId,
          metadata: { referrerId, referralCode }
        })
      });
    } catch (error) {
      console.error('Error awarding referral rewards:', error);
    }
    
    return { 
      success: true, 
      referrerId, 
      refereeId, 
      rewards: REFERRAL_REWARDS 
    };
    
  } catch (error) {
    console.error('Referral processing error:', error);
    return { success: false, error: 'Failed to process referral' };
  }
}

// GET - Get user's referral information
export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth();
    const { searchParams } = new URL(request.url);
    const includeStats = searchParams.get('stats') === 'true';
    const includeReferrals = searchParams.get('referrals') === 'true';
    
    if (process.env.MONGODB_URI) {
      await connectDB();
    }
    
    const userReferralCode = await getUserReferralCode(auth.id);
    
    let stats = null;
    if (includeStats) {
      stats = {
        totalReferrals: userReferralCode.totalReferrals,
        completedReferrals: userReferralCode.completedReferrals,
        totalRewards: userReferralCode.totalRewards
      };
    }
    
    let referrals = [];
    if (includeReferrals) {
      if (process.env.MONGODB_URI && mongoose.connections[0].readyState) {
        referrals = await Referral.find({ referrerId: auth.id })
          .sort({ createdAt: -1 })
          .limit(50);
      } else {
        referrals = Array.from(inMemoryReferralStorage.values())
          .filter(ref => ref.referrerId === auth.id)
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
          .slice(0, 50);
      }
    }
    
    return NextResponse.json({
      success: true,
      referralCode: userReferralCode.referralCode,
      referralUrl: `${process.env.NEXT_PUBLIC_BASE_URL || 'https://chatpye.com'}/sign-up?ref=${userReferralCode.referralCode}`,
      stats: includeStats ? stats : undefined,
      referrals: includeReferrals ? referrals.map(ref => ({
        id: ref._id,
        refereeId: ref.refereeId,
        status: ref.status,
        rewardType: ref.rewardType,
        referrerReward: ref.referrerReward,
        refereeReward: ref.refereeReward,
        createdAt: ref.createdAt,
        completedAt: ref.completedAt,
        rewardedAt: ref.rewardedAt
      })) : undefined,
      rewards: REFERRAL_REWARDS
    });
    
  } catch (error) {
    console.error('Referral retrieval error:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve referral information' },
      { status: 500 }
    );
  }
}

// POST - Create referral or process referral code
export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth();
    const { action, referralCode } = await request.json();
    
    if (process.env.MONGODB_URI) {
      await connectDB();
    }
    
    if (action === 'use_referral_code') {
      if (!referralCode) {
        return NextResponse.json({ 
          error: 'Referral code is required' 
        }, { status: 400 });
      }
      
      const result = await processReferralCompletion(auth.id, referralCode);
      
      if (!result.success) {
        return NextResponse.json({ 
          error: result.error 
        }, { status: 400 });
      }
      
      return NextResponse.json({
        success: true,
        message: 'Referral processed successfully! You and your referrer have been rewarded.',
        rewards: result.rewards
      });
      
    } else if (action === 'get_referral_info') {
      const userReferralCode = await getUserReferralCode(auth.id);
      
      return NextResponse.json({
        success: true,
        referralCode: userReferralCode.referralCode,
        referralUrl: `${process.env.NEXT_PUBLIC_BASE_URL || 'https://chatpye.com'}/sign-up?ref=${userReferralCode.referralCode}`,
        totalReferrals: userReferralCode.totalReferrals,
        completedReferrals: userReferralCode.completedReferrals,
        totalRewards: userReferralCode.totalRewards
      });
    }
    
    return NextResponse.json({ 
      error: 'Invalid action' 
    }, { status: 400 });
    
  } catch (error) {
    console.error('Referral action error:', error);
    return NextResponse.json(
      { error: 'Failed to process referral action' },
      { status: 500 }
    );
  }
}
