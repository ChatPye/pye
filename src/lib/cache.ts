// Simple in-memory cache for development
// For production, replace with Redis or AWS ElastiCache

interface CacheItem {
  value: unknown;
  timestamp: number;
  ttl: number; // Time to live in milliseconds
}

export class SimpleCache {
  private cache = new Map<string, CacheItem>();
  private maxSize = 1000; // Maximum number of items

  set(key: string, value: unknown, ttlMs: number = 5 * 60 * 1000): void {
    // Remove oldest items if cache is full
    if (this.cache.size >= this.maxSize) {
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey) {
        this.cache.delete(oldestKey);
      }
    }

    this.cache.set(key, {
      value,
      timestamp: Date.now(),
      ttl: ttlMs
    });
  }

  get(key: string): unknown | null {
    const item = this.cache.get(key);
    
    if (!item) {
      return null;
    }

    // Check if item has expired
    if (Date.now() - item.timestamp > item.ttl) {
      this.cache.delete(key);
      return null;
    }

    return item.value;
  }

  has(key: string): boolean {
    return this.get(key) !== null;
  }

  delete(key: string): void {
    this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  // Generate cache key for chat responses
  static generateChatKey(question: string, videoId: string): string {
    // Normalize the question for better cache hits
    const normalizedQuestion = question.toLowerCase().trim().replace(/\s+/g, ' ');
    return `chat:${videoId}:${Buffer.from(normalizedQuestion).toString('base64')}`;
  }

  // Generate cache key for video embeddings
  static generateVideoKey(videoId: string): string {
    return `video:${videoId}:embeddings`;
  }
}

// Export singleton instance
export const cache = new SimpleCache();

// For production Redis implementation
export interface RedisCache {
  set(key: string, value: unknown, ttlMs?: number): Promise<void>;
  get(key: string): Promise<unknown>;
  has(key: string): Promise<boolean>;
  delete(key: string): Promise<void>;
}

// Example Redis implementation (uncomment when ready)
/*
import Redis from 'ioredis';

const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
});

export const redisCache: RedisCache = {
  async set(key: string, value: any, ttlMs: number = 5 * 60 * 1000): Promise<void> {
    await redis.setex(key, Math.floor(ttlMs / 1000), JSON.stringify(value));
  },

  async get(key: string): Promise<any> {
    const value = await redis.get(key);
    return value ? JSON.parse(value) : null;
  },

  async has(key: string): Promise<boolean> {
    return (await redis.exists(key)) === 1;
  },

  async delete(key: string): Promise<void> {
    await redis.del(key);
  }
};
*/
