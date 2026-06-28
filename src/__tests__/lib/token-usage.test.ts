import { 
  calculateTokenCost, 
  checkTokenAvailability, 
  deductTokens, 
  addTokens,
  getUserUsageStats,
  TOKEN_COSTS,
  TIER_LIMITS 
} from '@/lib/token-usage';

// Add this to get access to the in-memory storage
const inMemoryStorage = require('@/lib/token-usage').inMemoryStorage;

// Use global mongoose mock from jest.setup.js

describe('Token Usage System', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Clear the in-memory storage before each test
    if (inMemoryStorage) {
      inMemoryStorage.userBalances.clear();
      inMemoryStorage.tokenUsage.clear();
    }
  });

  describe('calculateTokenCost', () => {
    it('should calculate correct cost for chat message', () => {
      const cost = calculateTokenCost('chat_message', {
        messageLength: 100,
        responseLength: 200,
        streaming: false
      });

      expect(cost).toBe(13); // 10 + (100 * 0.01) + (200 * 0.01) = 13
    });

    it('should include streaming bonus', () => {
      const cost = calculateTokenCost('chat_message', {
        messageLength: 50,
        responseLength: 100,
        streaming: true
      });

      expect(cost).toBe(17); // 10 + (50 * 0.01) + (100 * 0.01) + 5 = 17
    });

    it('should calculate cost for video processing', () => {
      const cost = calculateTokenCost('video_processing', {
        duration: 10, // 10 minutes
        embeddings: true
      });

      expect(cost).toBe(120); // 50 + (10 * 5) + 20 = 120
    });

    it('should calculate cost for audio processing', () => {
      const cost = calculateTokenCost('audio_processing', {
        duration: 5, // 5 minutes
        transcription: true
      });

      expect(cost).toBe(180); // 100 + (5 * 10) + 30 = 180
    });

    it('should return 0 for unknown action', () => {
      const cost = calculateTokenCost('unknown_action', {});
      expect(cost).toBe(0);
    });
  });

  describe('checkTokenAvailability', () => {
    it('should return available true when user has enough tokens', async () => {
      const result = await checkTokenAvailability('user123', 100);
      
      expect(result.available).toBe(true);
      expect(result.balance).toBe(1000); // Default free tier
      expect(result.limit).toBe(1000);
    });

    it('should return available false when user has insufficient tokens', async () => {
      const result = await checkTokenAvailability('user123', 2000);
      
      expect(result.available).toBe(false);
      expect(result.balance).toBe(1000);
      expect(result.limit).toBe(1000);
    });
  });

  describe('deductTokens', () => {
    it('should successfully deduct tokens', async () => {
      const result = await deductTokens('user123', 'chat_message', 50, {
        messageLength: 100,
        responseLength: 200
      });

      expect(result.success).toBe(true);
      expect(result.newBalance).toBe(950); // 1000 - 50
    });

    it('should fail when insufficient tokens', async () => {
      const result = await deductTokens('user123', 'chat_message', 2000, {
        messageLength: 100,
        responseLength: 200
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Insufficient tokens');
    });
  });

  describe('addTokens', () => {
    it('should successfully add tokens', async () => {
      // Set a baseline balance
      if (inMemoryStorage) {
        inMemoryStorage.userBalances.set('user123', {
          userId: 'user123',
          currentBalance: 950,
          monthlyLimit: 1000,
          tier: 'free',
          lastResetDate: new Date(),
          totalUsed: 50,
          totalEarned: 1000
        });
      }

      const result = await addTokens('user123', 100, 'referral_bonus');

      expect(result.success).toBe(true);
      expect(result.newBalance).toBe(1050);
    });
  });

  describe('getUserUsageStats', () => {
    it('should return usage statistics', async () => {
      // Set a baseline usage
      if (inMemoryStorage) {
        inMemoryStorage.tokenUsage.set('usage1', {
          userId: 'user123',
          action: 'chat_message',
          tokensUsed: 50,
          billingPeriod: new Date().toISOString().slice(0, 7)
        });
      }

      const stats = await getUserUsageStats('user123', 'current');

      expect(stats.totalUsed).toBe(50);
      expect(stats.actionBreakdown).toEqual({ chat_message: 50 });
      expect(stats.usageCount).toBe(1);
    });
  });

  describe('Token Costs Configuration', () => {
    it('should have correct token costs structure', () => {
      expect(TOKEN_COSTS.chat_message).toBeDefined();
      expect(TOKEN_COSTS.video_processing).toBeDefined();
      expect(TOKEN_COSTS.audio_processing).toBeDefined();
      expect(TOKEN_COSTS.ocr_processing).toBeDefined();
      expect(TOKEN_COSTS.embedding_generation).toBeDefined();
      expect(TOKEN_COSTS.share_creation).toBeDefined();
    });

    it('should have correct tier limits structure', () => {
      expect(TIER_LIMITS.free).toBeDefined();
      expect(TIER_LIMITS.pro).toBeDefined();
      expect(TIER_LIMITS.enterprise).toBeDefined();

      expect(TIER_LIMITS.free.monthly).toBe(1000);
      expect(TIER_LIMITS.pro.monthly).toBe(10000);
      expect(TIER_LIMITS.enterprise.monthly).toBe(100000);
    });
  });
});
