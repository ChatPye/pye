import { connectToDatabase } from './database';

// XP event schema
interface XPEvent {
  _id?: string;
  userId: string;
  action: string;
  xpAmount: number;
  metadata?: {
    videoId?: string;
    noteId?: string;
    chatSessionId?: string;
    referralId?: string;
    [key: string]: any;
  };
  createdAt: Date;
}

// XP rewards for different actions
export const XP_REWARDS = {
  // Video activities
  VIDEO_WATCHED: 2, // Per video watched (max 1 per video per day)
  VIDEO_COMPLETED: 5, // Video watched to 80%+ completion
  
  // Note activities
  NOTE_CREATED: 3, // Per note created
  NOTE_SHARED: 5, // Per note shared publicly
  
  // Chat activities
  CHAT_SESSION_STARTED: 1, // Per chat session
  CHAT_MESSAGE_SENT: 1, // Per message sent (max 10 per day)
  
  // Social activities
  REFERRAL_SUCCESSFUL: 10, // Per successful referral
  COMMUNITY_QUESTION_ANSWERED: 5, // Per helpful answer
  COMMUNITY_QUESTION_ASKED: 2, // Per question asked
  
  // Engagement activities
  DAILY_LOGIN: 1, // Per day (max 1 per day)
  WEEKLY_ACTIVE: 5, // Per week (max 1 per week)
  MONTHLY_ACTIVE: 20, // Per month (max 1 per month)
  
  // Special achievements
  FIRST_NOTE: 10, // First note created
  FIRST_CHAT: 10, // First chat session
  POWER_USER: 50, // 100+ notes created
  SOCIAL_BUTTERFLY: 50, // 10+ referrals
  KNOWLEDGE_SEEKER: 50, // 50+ videos watched
};

// Daily limits to prevent XP farming
export const XP_DAILY_LIMITS = {
  VIDEO_WATCHED: 1, // Max 1 XP per video per day
  CHAT_MESSAGE_SENT: 10, // Max 10 XP from messages per day
  DAILY_LOGIN: 1, // Max 1 XP per day for login
};

// Award XP for an action
export async function awardXP(
  userId: string, 
  action: keyof typeof XP_REWARDS, 
  metadata: any = {}
): Promise<{ success: boolean; xpAwarded: number; newTotal: number; levelUp?: boolean }> {
  try {
    const db = await connectToDatabase();
    const xpEvents = db.collection<XPEvent>('xpEvents');
    const users = await getUsersCollection();

    const xpAmount = XP_REWARDS[action];
    if (!xpAmount) {
      return { success: false, xpAwarded: 0, newTotal: 0 };
    }

    // Check daily limits
    if (await isDailyLimitReached(userId, action)) {
      return { success: false, xpAwarded: 0, newTotal: 0 };
    }

    // Check if this is a special achievement
    const isSpecialAchievement = await checkSpecialAchievement(userId, action, metadata);
    if (isSpecialAchievement) {
      // Award bonus XP for special achievements
      const bonusXP = isSpecialAchievement.bonusXP;
      await createXPEvent(userId, action, bonusXP, metadata);
    }

    // Create XP event
    await createXPEvent(userId, action, xpAmount, metadata);

    // Update user's total XP
    const user = await users.findOne({ clerkId: userId });
    if (!user) {
      return { success: false, xpAwarded: 0, newTotal: 0 };
    }

    const newTotal = user.xp.total + xpAmount;
    const oldLevel = Math.floor(user.xp.total / 100) + 1;
    const newLevel = Math.floor(newTotal / 100) + 1;
    const levelUp = newLevel > oldLevel;

    await users.updateOne(
      { clerkId: userId },
      {
        $inc: { 'xp.total': xpAmount },
        $set: {
          'xp.level': newLevel,
          'xp.nextLevelAt': newLevel * 100,
          'xp.tokensFromXP': Math.floor(newTotal / 10) // 1 token per 10 XP
        }
      }
    );

    return {
      success: true,
      xpAwarded: xpAmount,
      newTotal,
      levelUp
    };

  } catch (error) {
    console.error('Error awarding XP:', error);
    return { success: false, xpAwarded: 0, newTotal: 0 };
  }
}

// Check if daily limit is reached for an action
async function isDailyLimitReached(userId: string, action: keyof typeof XP_REWARDS): Promise<boolean> {
  const dailyLimit = XP_DAILY_LIMITS[action as keyof typeof XP_DAILY_LIMITS];
  if (!dailyLimit) return false;

  const db = await connectToDatabase();
  const xpEvents = db.collection<XPEvent>('xpEvents');

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const count = await xpEvents.countDocuments({
    userId,
    action,
    createdAt: { $gte: today, $lt: tomorrow }
  });

  return count >= dailyLimit;
}

// Check for special achievements
async function checkSpecialAchievement(
  userId: string, 
  action: keyof typeof XP_REWARDS, 
  metadata: any
): Promise<{ bonusXP: number; achievement: string } | null> {
  const db = await connectToDatabase();
  const xpEvents = db.collection<XPEvent>('xpEvents');

  switch (action) {
    case 'NOTE_CREATED':
      // Check if this is the first note
      const noteCount = await xpEvents.countDocuments({
        userId,
        action: 'NOTE_CREATED'
      });
      if (noteCount === 0) {
        return { bonusXP: XP_REWARDS.FIRST_NOTE, achievement: 'First Note Created!' };
      }
      break;

    case 'CHAT_SESSION_STARTED':
      // Check if this is the first chat
      const chatCount = await xpEvents.countDocuments({
        userId,
        action: 'CHAT_SESSION_STARTED'
      });
      if (chatCount === 0) {
        return { bonusXP: XP_REWARDS.FIRST_CHAT, achievement: 'First Chat Session!' };
      }
      break;

    case 'NOTE_CREATED':
      // Check for Power User (100+ notes)
      const totalNotes = await xpEvents.countDocuments({
        userId,
        action: 'NOTE_CREATED'
      });
      if (totalNotes === 100) {
        return { bonusXP: XP_REWARDS.POWER_USER, achievement: 'Power User - 100 Notes!' };
      }
      break;

    case 'REFERRAL_SUCCESSFUL':
      // Check for Social Butterfly (10+ referrals)
      const totalReferrals = await xpEvents.countDocuments({
        userId,
        action: 'REFERRAL_SUCCESSFUL'
      });
      if (totalReferrals === 10) {
        return { bonusXP: XP_REWARDS.SOCIAL_BUTTERFLY, achievement: 'Social Butterfly - 10 Referrals!' };
      }
      break;

    case 'VIDEO_WATCHED':
      // Check for Knowledge Seeker (50+ videos)
      const totalVideos = await xpEvents.countDocuments({
        userId,
        action: 'VIDEO_WATCHED'
      });
      if (totalVideos === 50) {
        return { bonusXP: XP_REWARDS.KNOWLEDGE_SEEKER, achievement: 'Knowledge Seeker - 50 Videos!' };
      }
      break;
  }

  return null;
}

// Create XP event record
async function createXPEvent(userId: string, action: string, xpAmount: number, metadata: any = {}): Promise<void> {
  const db = await connectToDatabase();
  const xpEvents = db.collection<XPEvent>('xpEvents');

  const xpEvent: XPEvent = {
    userId,
    action,
    xpAmount,
    metadata,
    createdAt: new Date()
  };

  await xpEvents.insertOne(xpEvent);
}

// Get user's XP history
export async function getUserXPHistory(userId: string, limit: number = 50): Promise<XPEvent[]> {
  const db = await connectToDatabase();
  const xpEvents = db.collection<XPEvent>('xpEvents');

  return await xpEvents
    .find({ userId })
    .sort({ createdAt: -1 })
    .limit(limit)
    .toArray();
}

// Get user's XP statistics
export async function getUserXPStats(userId: string): Promise<{
  totalXP: number;
  level: number;
  nextLevelAt: number;
  xpThisWeek: number;
  xpThisMonth: number;
  topActions: Array<{ action: string; count: number; totalXP: number }>;
}> {
  const db = await connectToDatabase();
  const xpEvents = db.collection<XPEvent>('xpEvents');
  const users = await getUsersCollection();

  const user = await users.findOne({ clerkId: userId });
  if (!user) {
    throw new Error('User not found');
  }

  // Get XP for this week
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);
  const xpThisWeek = await xpEvents.aggregate([
    { $match: { userId, createdAt: { $gte: weekAgo } } },
    { $group: { _id: null, total: { $sum: '$xpAmount' } } }
  ]).toArray();

  // Get XP for this month
  const monthAgo = new Date();
  monthAgo.setMonth(monthAgo.getMonth() - 1);
  const xpThisMonth = await xpEvents.aggregate([
    { $match: { userId, createdAt: { $gte: monthAgo } } },
    { $group: { _id: null, total: { $sum: '$xpAmount' } } }
  ]).toArray();

  // Get top actions
  const topActions = await xpEvents.aggregate([
    { $match: { userId } },
    { $group: { 
        _id: '$action', 
        count: { $sum: 1 }, 
        totalXP: { $sum: '$xpAmount' } 
      } 
    },
    { $sort: { totalXP: -1 } },
    { $limit: 5 }
  ]).toArray();

  return {
    totalXP: user.xp.total,
    level: user.xp.level,
    nextLevelAt: user.xp.nextLevelAt,
    xpThisWeek: xpThisWeek[0]?.total || 0,
    xpThisMonth: xpThisMonth[0]?.total || 0,
    topActions: topActions.map((action: any) => ({
      action: action._id,
      count: action.count,
      totalXP: action.totalXP
    }))
  };
}

// Helper function to get users collection
async function getUsersCollection() {
  const db = await connectToDatabase();
  return db.collection('users');
}
