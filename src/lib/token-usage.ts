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

// DocumentDB schema for token usage tracking
const TokenUsageSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  action: { 
    type: String, 
    required: true,
    enum: ['chat_message', 'video_processing', 'audio_processing', 'ocr_processing', 'embedding_generation', 'share_creation']
  },
  tokensUsed: { type: Number, required: true },
  metadata: {
    videoId: String,
    messageLength: Number,
    responseLength: Number,
    processingTime: Number,
    model: String,
    tier: String
  },
  timestamp: { type: Date, default: Date.now },
  billingPeriod: { type: String, required: true } // Format: YYYY-MM
});

const TokenUsage = mongoose.models.TokenUsage || mongoose.model('TokenUsage', TokenUsageSchema);

// DocumentDB schema for user token balances
const UserTokenBalanceSchema = new mongoose.Schema({
  userId: { type: String, required: true, unique: true },
  currentBalance: { type: Number, default: 0 },
  monthlyLimit: { type: Number, default: 1000 },
  tier: { type: String, enum: ['free', 'pro', 'enterprise'], default: 'free' },
  lastResetDate: { type: Date, default: Date.now },
  totalUsed: { type: Number, default: 0 },
  totalEarned: { type: Number, default: 0 }
});

const UserTokenBalance = mongoose.models.UserTokenBalance || mongoose.model('UserTokenBalance', UserTokenBalanceSchema);

// In-memory storage for development
const inMemoryStorage = {
  tokenUsage: new Map<string, any>(),
  userBalances: new Map<string, any>()
};

// Token costs per action
export const TOKEN_COSTS = {
  chat_message: {
    base: 10,
    per_character: 0.01,
    streaming_bonus: 5
  },
  video_processing: {
    base: 50,
    per_minute: 5,
    embedding_bonus: 20
  },
  audio_processing: {
    base: 100,
    per_minute: 10,
    transcription_bonus: 30
  },
  ocr_processing: {
    base: 25,
    per_image: 5,
    text_extraction_bonus: 10
  },
  embedding_generation: {
    base: 5,
    per_chunk: 2
  },
  share_creation: {
    base: 1
  }
};

// Tier-based token limits
export const TIER_LIMITS = {
  free: {
    monthly: 1000,
    daily: 50,
    hourly: 10
  },
  pro: {
    monthly: 10000,
    daily: 500,
    hourly: 50
  },
  enterprise: {
    monthly: 100000,
    daily: 5000,
    hourly: 500
  }
};

// Calculate token cost for an action
export function calculateTokenCost(action: string, metadata: any = {}): number {
  const cost = TOKEN_COSTS[action as keyof typeof TOKEN_COSTS];
  if (!cost) return 0;

  let totalCost = cost.base;

  switch (action) {
    case 'chat_message': {
      const chatCost = cost as typeof TOKEN_COSTS.chat_message;
      totalCost += (metadata.messageLength || 0) * chatCost.per_character;
      totalCost += (metadata.responseLength || 0) * chatCost.per_character;
      if (metadata.streaming) totalCost += chatCost.streaming_bonus;
      break;
    }
    
    case 'video_processing': {
      const videoCost = cost as typeof TOKEN_COSTS.video_processing;
      totalCost += (metadata.duration || 0) * videoCost.per_minute;
      if (metadata.embeddings) totalCost += videoCost.embedding_bonus;
      break;
    }
    
    case 'audio_processing': {
      const audioCost = cost as typeof TOKEN_COSTS.audio_processing;
      totalCost += (metadata.duration || 0) * audioCost.per_minute;
      if (metadata.transcription) totalCost += audioCost.transcription_bonus;
      break;
    }
    
    case 'ocr_processing': {
      const ocrCost = cost as typeof TOKEN_COSTS.ocr_processing;
      totalCost += (metadata.imageCount || 1) * ocrCost.per_image;
      if (metadata.textExtracted) totalCost += ocrCost.text_extraction_bonus;
      break;
    }
    
    case 'embedding_generation': {
      const embeddingCost = cost as typeof TOKEN_COSTS.embedding_generation;
      totalCost += (metadata.chunkCount || 1) * embeddingCost.per_chunk;
      break;
    }
  }

  return Math.ceil(totalCost);
}

// Get user token balance
export async function getUserTokenBalance(userId: string): Promise<any> {
  if (process.env.MONGODB_URI) {
    await connectDB();
  }

  let balance;
  if (process.env.MONGODB_URI && mongoose.connections[0].readyState) {
    balance = await UserTokenBalance.findOne({ userId });
    
    if (!balance) {
      // Create default balance for new user
      balance = new UserTokenBalance({
        userId,
        currentBalance: TIER_LIMITS.free.monthly,
        monthlyLimit: TIER_LIMITS.free.monthly,
        tier: 'free',
        lastResetDate: new Date(),
        totalUsed: 0,
        totalEarned: TIER_LIMITS.free.monthly
      });
      await balance.save();
    }
  } else {
    // Use in-memory storage for development
    balance = inMemoryStorage.userBalances.get(userId);
    
    if (!balance) {
      balance = {
        userId,
        currentBalance: TIER_LIMITS.free.monthly,
        monthlyLimit: TIER_LIMITS.free.monthly,
        tier: 'free',
        lastResetDate: new Date(),
        totalUsed: 0,
        totalEarned: TIER_LIMITS.free.monthly
      };
      inMemoryStorage.userBalances.set(userId, balance);
    }
  }

  return balance;
}

// Check if user has enough tokens
export async function checkTokenAvailability(userId: string, requiredTokens: number): Promise<{available: boolean, balance: number, limit: number}> {
  const balance = await getUserTokenBalance(userId);
  
  return {
    available: balance.currentBalance >= requiredTokens,
    balance: balance.currentBalance,
    limit: balance.monthlyLimit
  };
}

// Deduct tokens from user balance
export async function deductTokens(userId: string, action: string, tokensUsed: number, metadata: any = {}): Promise<{success: boolean, newBalance: number, error?: string}> {
  try {
    if (process.env.MONGODB_URI) {
      await connectDB();
    }

    const balance = await getUserTokenBalance(userId);
    
    if (balance.currentBalance < tokensUsed) {
      return {
        success: false,
        newBalance: balance.currentBalance,
        error: 'Insufficient tokens'
      };
    }

    // Update balance
    const newBalance = balance.currentBalance - tokensUsed;
    const totalUsed = balance.totalUsed + tokensUsed;

    if (process.env.MONGODB_URI && mongoose.connections[0].readyState) {
      await UserTokenBalance.findOneAndUpdate(
        { userId },
        { 
          currentBalance: newBalance,
          totalUsed
        }
      );
    } else {
      balance.currentBalance = newBalance;
      balance.totalUsed = totalUsed;
      inMemoryStorage.userBalances.set(userId, balance);
    }

    // Record usage
    const usage = {
      userId,
      action,
      tokensUsed,
      metadata,
      timestamp: new Date(),
      billingPeriod: new Date().toISOString().slice(0, 7) // YYYY-MM format
    };

    if (process.env.MONGODB_URI && mongoose.connections[0].readyState) {
      const tokenUsage = new TokenUsage(usage);
      await tokenUsage.save();
    } else {
      const usageId = `${userId}_${Date.now()}`;
      inMemoryStorage.tokenUsage.set(usageId, usage);
    }

    return {
      success: true,
      newBalance
    };

  } catch (error) {
    console.error('Error deducting tokens:', error);
    return {
      success: false,
      newBalance: 0,
      error: 'Failed to deduct tokens'
    };
  }
}

// Add tokens to user balance (for referrals, bonuses, etc.)
export async function addTokens(userId: string, tokens: number, reason: string = 'bonus'): Promise<{success: boolean, newBalance: number}> {
  try {
    if (process.env.MONGODB_URI) {
      await connectDB();
    }

    const balance = await getUserTokenBalance(userId);
    const newBalance = balance.currentBalance + tokens;
    const totalEarned = balance.totalEarned + tokens;

    if (process.env.MONGODB_URI && mongoose.connections[0].readyState) {
      await UserTokenBalance.findOneAndUpdate(
        { userId },
        { 
          currentBalance: newBalance,
          totalEarned
        }
      );
    } else {
      balance.currentBalance = newBalance;
      balance.totalEarned = totalEarned;
      inMemoryStorage.userBalances.set(userId, balance);
    }

    // Record the addition
    const usage = {
      userId,
      action: 'token_bonus' as any,
      tokensUsed: -tokens, // Negative to indicate addition
      metadata: { reason },
      timestamp: new Date(),
      billingPeriod: new Date().toISOString().slice(0, 7)
    };

    if (process.env.MONGODB_URI && mongoose.connections[0].readyState) {
      const tokenUsage = new TokenUsage(usage);
      await tokenUsage.save();
    } else {
      const usageId = `${userId}_${Date.now()}`;
      inMemoryStorage.tokenUsage.set(usageId, usage);
    }

    return {
      success: true,
      newBalance
    };

  } catch (error) {
    console.error('Error adding tokens:', error);
    return {
      success: false,
      newBalance: 0
    };
  }
}

// Get usage statistics for a user
export async function getUserUsageStats(userId: string, period: string = 'current'): Promise<any> {
  const billingPeriod = period === 'current' 
    ? new Date().toISOString().slice(0, 7)
    : period;
  try {
    if (process.env.MONGODB_URI) {
      await connectDB();
    }

    let usage;
    if (process.env.MONGODB_URI && mongoose.connections[0].readyState) {
      usage = await TokenUsage.find({ 
        userId, 
        billingPeriod,
        tokensUsed: { $gt: 0 } // Exclude token additions
      }).sort({ timestamp: -1 });
    } else {
      usage = Array.from(inMemoryStorage.tokenUsage.values())
        .filter((u: any) => u.userId === userId && u.billingPeriod === billingPeriod && u.tokensUsed > 0)
        .sort((a: any, b: any) => b.timestamp - a.timestamp);
    }

    const totalUsed = usage.reduce((sum: number, u: any) => sum + u.tokensUsed, 0);
    const actionBreakdown = usage.reduce((acc: any, u: any) => {
      acc[u.action] = (acc[u.action] || 0) + u.tokensUsed;
      return acc;
    }, {});

    return {
      totalUsed,
      actionBreakdown,
      usageCount: usage.length,
      billingPeriod: billingPeriod,
      usage
    };

  } catch (error) {
    console.error('Error getting usage stats:', error);
    return {
      totalUsed: 0,
      actionBreakdown: {},
      usageCount: 0,
      billingPeriod: billingPeriod,
      usage: []
    };
  }
}

// Reset monthly token balance (called by cron job)
export async function resetMonthlyBalances(): Promise<void> {
  try {
    if (process.env.MONGODB_URI) {
      await connectDB();
    }

    const currentDate = new Date();
    const currentMonth = currentDate.toISOString().slice(0, 7);

    if (process.env.MONGODB_URI && mongoose.connections[0].readyState) {
      const users = await UserTokenBalance.find({
        $or: [
          { lastResetDate: { $lt: new Date(currentDate.getFullYear(), currentDate.getMonth(), 1) } },
          { lastResetDate: { $exists: false } }
        ]
      });

      for (const user of users) {
        const tierLimits = TIER_LIMITS[user.tier as keyof typeof TIER_LIMITS] || TIER_LIMITS.free;
        
        await UserTokenBalance.findOneAndUpdate(
          { userId: user.userId },
          {
            currentBalance: tierLimits.monthly,
            monthlyLimit: tierLimits.monthly,
            lastResetDate: currentDate
          }
        );
      }
    } else {
      // Reset in-memory balances
      for (const [userId, balance] of inMemoryStorage.userBalances.entries()) {
        const tierLimits = TIER_LIMITS[balance.tier as keyof typeof TIER_LIMITS] || TIER_LIMITS.free;
        balance.currentBalance = tierLimits.monthly;
        balance.monthlyLimit = tierLimits.monthly;
        balance.lastResetDate = currentDate;
        inMemoryStorage.userBalances.set(userId, balance);
      }
    }

    console.log('Monthly token balances reset successfully');
  } catch (error) {
    console.error('Error resetting monthly balances:', error);
  }
}
