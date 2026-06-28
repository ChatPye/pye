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

// User XP schema
const UserXPSchema = new mongoose.Schema({
  userId: { type: String, required: true, unique: true },
  totalXP: { type: Number, default: 0 },
  level: { type: Number, default: 1 },
  currentLevelXP: { type: Number, default: 0 },
  nextLevelXP: { type: Number, default: 100 },
  badges: [String],
  achievements: [String],
  streak: { type: Number, default: 0 },
  lastActivity: { type: Date, default: Date.now },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// XP activity log schema
const XPActivitySchema = new mongoose.Schema({
  userId: { type: String, required: true },
  action: { 
    type: String, 
    enum: [
      'video_watched', 
      'question_asked', 
      'note_created', 
      'bookmark_created', 
      'referral', 
      'daily_login',
      'weekly_streak',
      'first_video',
      'first_note',
      'first_share',
      'extension_install',
      'upgrade_pro'
    ],
    required: true 
  },
  xpEarned: { type: Number, required: true },
  videoId: { type: String, default: '' },
  metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  timestamp: { type: Date, default: Date.now }
});

const UserXP = mongoose.models.UserXP || mongoose.model('UserXP', UserXPSchema);
const XPActivity = mongoose.models.XPActivity || mongoose.model('XPActivity', XPActivitySchema);

// In-memory storage for development
const inMemoryXPStorage = new Map();
const inMemoryActivityStorage = new Map();

// XP rewards configuration
const XP_REWARDS = {
  video_watched: 10,
  question_asked: 5,
  note_created: 15,
  bookmark_created: 8,
  referral: 100, // Highest reward for referrals
  daily_login: 5,
  weekly_streak: 50,
  first_video: 25,
  first_note: 20,
  first_share: 15,
  extension_install: 30,
  upgrade_pro: 75
};

// Level calculation
function calculateLevel(totalXP: number): { level: number; currentLevelXP: number; nextLevelXP: number } {
  // XP required for each level (exponential growth)
  const baseXP = 100;
  const level = Math.floor(Math.sqrt(totalXP / baseXP)) + 1;
  const currentLevelXP = totalXP - (Math.pow(level - 1, 2) * baseXP);
  const nextLevelXP = (Math.pow(level, 2) * baseXP) - totalXP;
  
  return { level, currentLevelXP, nextLevelXP };
}

// Badge system
const BADGES = {
  'first_steps': { name: 'First Steps', description: 'Created your first note', xpRequired: 20 },
  'video_master': { name: 'Video Master', description: 'Watched 10 videos', xpRequired: 100 },
  'question_king': { name: 'Question King', description: 'Asked 50 questions', xpRequired: 250 },
  'note_taker': { name: 'Note Taker', description: 'Created 25 notes', xpRequired: 375 },
  'bookmarker': { name: 'Bookmarker', description: 'Created 50 bookmarks', xpRequired: 400 },
  'referral_champ': { name: 'Referral Champ', description: 'Referred 5 friends', xpRequired: 500 },
  'streak_master': { name: 'Streak Master', description: '7-day login streak', xpRequired: 350 },
  'early_adopter': { name: 'Early Adopter', description: 'Installed the extension', xpRequired: 30 },
  'pro_user': { name: 'Pro User', description: 'Upgraded to Pro', xpRequired: 75 },
  'level_10': { name: 'Level 10', description: 'Reached level 10', xpRequired: 1000 },
  'level_25': { name: 'Level 25', description: 'Reached level 25', xpRequired: 6250 },
  'level_50': { name: 'Level 50', description: 'Reached level 50', xpRequired: 25000 }
};

// Get or create user XP
async function getUserXP(userId: string) {
  let userXP;
  
  if (process.env.MONGODB_URI && mongoose.connections[0].readyState) {
    userXP = await UserXP.findOne({ userId });
    
    if (!userXP) {
      userXP = new UserXP({
        userId,
        totalXP: 0,
        level: 1,
        currentLevelXP: 0,
        nextLevelXP: 100
      });
      await userXP.save();
    }
  } else {
    // Use in-memory storage for development
    userXP = inMemoryXPStorage.get(userId);
    
    if (!userXP) {
      userXP = {
        userId,
        totalXP: 0,
        level: 1,
        currentLevelXP: 0,
        nextLevelXP: 100,
        badges: [],
        achievements: [],
        streak: 0,
        lastActivity: new Date(),
        createdAt: new Date(),
        updatedAt: new Date()
      };
      inMemoryXPStorage.set(userId, userXP);
    }
  }
  
  return userXP;
}

// Award XP to user
async function awardXP(userId: string, action: string, metadata: any = {}): Promise<number> {
  const xpReward = XP_REWARDS[action as keyof typeof XP_REWARDS] || 0;
  
  if (xpReward === 0) {
    return 0;
  }
  
  const userXP = await getUserXP(userId);
  
  // Check for streak bonus
  const now = new Date();
  const lastActivity = new Date(userXP.lastActivity);
  const daysSinceLastActivity = Math.floor((now.getTime() - lastActivity.getTime()) / (1000 * 60 * 60 * 24));
  
  let bonusXP = 0;
  if (daysSinceLastActivity === 1) {
    // Daily streak maintained
    userXP.streak += 1;
    if (userXP.streak % 7 === 0) {
      // Weekly streak bonus
      bonusXP = XP_REWARDS.weekly_streak;
    }
  } else if (daysSinceLastActivity === 0) {
    // Same day, maintain streak
  } else {
    // Streak broken
    userXP.streak = 1;
  }
  
  // Award XP
  userXP.totalXP += xpReward + bonusXP;
  userXP.lastActivity = now;
  userXP.updatedAt = now;
  
  // Recalculate level
  const levelData = calculateLevel(userXP.totalXP);
  userXP.level = levelData.level;
  userXP.currentLevelXP = levelData.currentLevelXP;
  userXP.nextLevelXP = levelData.nextLevelXP;
  
  // Check for new badges
  const newBadges = checkForNewBadges(userXP);
  if (newBadges.length > 0) {
    userXP.badges.push(...newBadges);
    userXP.achievements.push(...newBadges.map(badge => `Earned ${BADGES[badge as keyof typeof BADGES].name} badge`));
  }
  
  // Save XP
  if (process.env.MONGODB_URI && mongoose.connections[0].readyState) {
    await userXP.save();
  } else {
    inMemoryXPStorage.set(userId, userXP);
  }
  
  // Log activity
  const activityLog = {
    userId,
    action,
    xpEarned: xpReward + bonusXP,
    videoId: metadata.videoId || '',
    metadata: { ...metadata, bonusXP, streak: userXP.streak },
    timestamp: now
  };
  
  if (process.env.MONGODB_URI && mongoose.connections[0].readyState) {
    const activity = new XPActivity(activityLog);
    await activity.save();
  } else {
    const activityId = `${userId}_${Date.now()}_${Math.random()}`;
    inMemoryActivityStorage.set(activityId, activityLog);
  }
  
  return xpReward + bonusXP;
}

// Check for new badges
function checkForNewBadges(userXP: any): string[] {
  const newBadges = [];
  
  for (const [badgeId, badge] of Object.entries(BADGES)) {
    if (!userXP.badges.includes(badgeId) && userXP.totalXP >= badge.xpRequired) {
      newBadges.push(badgeId);
    }
  }
  
  return newBadges;
}

// Get leaderboard
async function getLeaderboard(limit: number = 10): Promise<any[]> {
  let users;
  
  if (process.env.MONGODB_URI && mongoose.connections[0].readyState) {
    users = await UserXP.find({})
      .sort({ totalXP: -1 })
      .limit(limit);
  } else {
    users = Array.from(inMemoryXPStorage.values())
      .sort((a, b) => b.totalXP - a.totalXP)
      .slice(0, limit);
  }
  
  return users.map(user => ({
    userId: user.userId,
    totalXP: user.totalXP,
    level: user.level,
    badges: user.badges,
    streak: user.streak
  }));
}

// GET - Get user's XP and leaderboard
export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth();
    const { searchParams } = new URL(request.url);
    const includeLeaderboard = searchParams.get('leaderboard') === 'true';
    const includeActivity = searchParams.get('activity') === 'true';
    
    if (process.env.MONGODB_URI) {
      await connectDB();
    }
    
    const userXP = await getUserXP(auth.id);
    
    let leaderboard = [];
    if (includeLeaderboard) {
      leaderboard = await getLeaderboard(20);
    }
    
    let recentActivity = [];
    if (includeActivity) {
      if (process.env.MONGODB_URI && mongoose.connections[0].readyState) {
        recentActivity = await XPActivity.find({ userId: auth.id })
          .sort({ timestamp: -1 })
          .limit(20);
      } else {
        recentActivity = Array.from(inMemoryActivityStorage.values())
          .filter(activity => activity.userId === auth.id)
          .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
          .slice(0, 20);
      }
    }
    
    return NextResponse.json({
      success: true,
      xp: {
        totalXP: userXP.totalXP,
        level: userXP.level,
        currentLevelXP: userXP.currentLevelXP,
        nextLevelXP: userXP.nextLevelXP,
        badges: userXP.badges,
        achievements: userXP.achievements,
        streak: userXP.streak,
        lastActivity: userXP.lastActivity
      },
      leaderboard: includeLeaderboard ? leaderboard : undefined,
      recentActivity: includeActivity ? recentActivity.map(activity => ({
        action: activity.action,
        xpEarned: activity.xpEarned,
        videoId: activity.videoId,
        metadata: activity.metadata,
        timestamp: activity.timestamp
      })) : undefined,
      rewards: XP_REWARDS,
      badges: BADGES
    });
    
  } catch (error) {
    console.error('XP retrieval error:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve XP data' },
      { status: 500 }
    );
  }
}

// POST - Award XP or perform XP actions
export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth();
    const { action, metadata = {} } = await request.json();
    
    if (!action) {
      return NextResponse.json({ 
        error: 'Action is required' 
      }, { status: 400 });
    }
    
    if (process.env.MONGODB_URI) {
      await connectDB();
    }
    
    const xpEarned = await awardXP(auth.id, action, metadata);
    
    if (xpEarned === 0) {
      return NextResponse.json({ 
        error: 'Invalid action or no XP awarded' 
      }, { status: 400 });
    }
    
    const userXP = await getUserXP(auth.id);
    
    return NextResponse.json({
      success: true,
      xpEarned,
      newTotalXP: userXP.totalXP,
      level: userXP.level,
      currentLevelXP: userXP.currentLevelXP,
      nextLevelXP: userXP.nextLevelXP,
      badges: userXP.badges,
      streak: userXP.streak,
      message: `Earned ${xpEarned} XP!`
    });
    
  } catch (error) {
    console.error('XP award error:', error);
    return NextResponse.json(
      { error: 'Failed to award XP' },
      { status: 500 }
    );
  }
}

// PUT - Update XP (for admin use)
export async function PUT(request: NextRequest) {
  try {
    const auth = await requireAuth();
    const { 
      userId, 
      xp, 
      level, 
      badges, 
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
    
    const userXP = await getUserXP(userId);
    
    if (xp !== undefined) {
      userXP.totalXP = xp;
      const levelData = calculateLevel(userXP.totalXP);
      userXP.level = levelData.level;
      userXP.currentLevelXP = levelData.currentLevelXP;
      userXP.nextLevelXP = levelData.nextLevelXP;
      userXP.updatedAt = new Date();
    }
    
    if (level !== undefined) {
      userXP.level = level;
      userXP.updatedAt = new Date();
    }
    
    if (badges !== undefined) {
      userXP.badges = badges;
      userXP.updatedAt = new Date();
    }
    
    // Save XP
    if (process.env.MONGODB_URI && mongoose.connections[0].readyState) {
      await userXP.save();
    } else {
      inMemoryXPStorage.set(userId, userXP);
    }
    
    // Log admin action
    const activityLog = {
      userId,
      action: 'admin_adjustment' as any,
      xpEarned: 0,
      videoId: '',
      metadata: { reason, adminId: auth.id, xp, level, badges },
      timestamp: new Date()
    };
    
    if (process.env.MONGODB_URI && mongoose.connections[0].readyState) {
      const activity = new XPActivity(activityLog);
      await activity.save();
    } else {
      const activityId = `${userId}_${Date.now()}_${Math.random()}`;
      inMemoryActivityStorage.set(activityId, activityLog);
    }
    
    return NextResponse.json({
      success: true,
      message: 'XP updated successfully',
      xp: {
        totalXP: userXP.totalXP,
        level: userXP.level,
        currentLevelXP: userXP.currentLevelXP,
        nextLevelXP: userXP.nextLevelXP,
        badges: userXP.badges,
        streak: userXP.streak
      }
    });
    
  } catch (error) {
    console.error('XP update error:', error);
    return NextResponse.json(
      { error: 'Failed to update XP' },
      { status: 500 }
    );
  }
}

