import { Redis } from 'ioredis';

// Redis Cache Service for ChatPye
export class RedisCacheService {
  private redis: Redis;
  private isConnected: boolean = false;

  constructor() {
    this.redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD,
      maxRetriesPerRequest: 3,
      lazyConnect: true,
    });

    this.redis.on('connect', () => {
      console.log('Redis connected');
      this.isConnected = true;
    });

    this.redis.on('error', (error: any) => {
      console.error('Redis connection error:', error);
      this.isConnected = false;
    });
  }

  // Connect to Redis
  async connect(): Promise<void> {
    try {
      await this.redis.connect();
      this.isConnected = true;
    } catch (error) {
      console.error('Failed to connect to Redis:', error);
      this.isConnected = false;
    }
  }

  // Check if Redis is available
  isAvailable(): boolean {
    return this.isConnected;
  }

  // Cache chat response
  async cacheChatResponse(
    userId: string,
    videoId: string,
    query: string,
    response: string,
    ttl: number = 3600 // 1 hour
  ): Promise<void> {
    if (!this.isAvailable()) return;

    try {
      const key = `chat:${userId}:${videoId}:${this.hashQuery(query)}`;
      await this.redis.setex(key, ttl, JSON.stringify({
        response,
        timestamp: Date.now(),
        query,
      }));
    } catch (error) {
      console.error('Failed to cache chat response:', error);
    }
  }

  // Get cached chat response
  async getCachedChatResponse(
    userId: string,
    videoId: string,
    query: string
  ): Promise<string | null> {
    if (!this.isAvailable()) return null;

    try {
      const key = `chat:${userId}:${videoId}:${this.hashQuery(query)}`;
      const cached = await this.redis.get(key);
      
      if (cached) {
        const data = JSON.parse(cached);
        return data.response;
      }
      
      return null;
    } catch (error) {
      console.error('Failed to get cached chat response:', error);
      return null;
    }
  }

  // Cache video embeddings
  async cacheVideoEmbeddings(
    videoId: string,
    embeddings: number[][],
    chunks: string[],
    ttl: number = 86400 // 24 hours
  ): Promise<void> {
    if (!this.isAvailable()) return;

    try {
      const key = `embeddings:${videoId}`;
      await this.redis.setex(key, ttl, JSON.stringify({
        embeddings,
        chunks,
        timestamp: Date.now(),
      }));
    } catch (error) {
      console.error('Failed to cache video embeddings:', error);
    }
  }

  // Get cached video embeddings
  async getCachedVideoEmbeddings(videoId: string): Promise<{
    embeddings: number[][];
    chunks: string[];
  } | null> {
    if (!this.isAvailable()) return null;

    try {
      const key = `embeddings:${videoId}`;
      const cached = await this.redis.get(key);
      
      if (cached) {
        const data = JSON.parse(cached);
        return {
          embeddings: data.embeddings,
          chunks: data.chunks,
        };
      }
      
      return null;
    } catch (error) {
      console.error('Failed to get cached video embeddings:', error);
      return null;
    }
  }

  // Cache user session data
  async cacheUserSession(
    userId: string,
    sessionData: any,
    ttl: number = 1800 // 30 minutes
  ): Promise<void> {
    if (!this.isAvailable()) return;

    try {
      const key = `session:${userId}`;
      await this.redis.setex(key, ttl, JSON.stringify({
        ...sessionData,
        timestamp: Date.now(),
      }));
    } catch (error) {
      console.error('Failed to cache user session:', error);
    }
  }

  // Get cached user session
  async getCachedUserSession(userId: string): Promise<any | null> {
    if (!this.isAvailable()) return null;

    try {
      const key = `session:${userId}`;
      const cached = await this.redis.get(key);
      
      if (cached) {
        const data = JSON.parse(cached);
        return data;
      }
      
      return null;
    } catch (error) {
      console.error('Failed to get cached user session:', error);
      return null;
    }
  }

  // Cache OCR results
  async cacheOCRResult(
    imageHash: string,
    result: any,
    ttl: number = 7200 // 2 hours
  ): Promise<void> {
    if (!this.isAvailable()) return;

    try {
      const key = `ocr:${imageHash}`;
      await this.redis.setex(key, ttl, JSON.stringify({
        ...result,
        timestamp: Date.now(),
      }));
    } catch (error) {
      console.error('Failed to cache OCR result:', error);
    }
  }

  // Get cached OCR result
  async getCachedOCRResult(imageHash: string): Promise<any | null> {
    if (!this.isAvailable()) return null;

    try {
      const key = `ocr:${imageHash}`;
      const cached = await this.redis.get(key);
      
      if (cached) {
        const data = JSON.parse(cached);
        return data;
      }
      
      return null;
    } catch (error) {
      console.error('Failed to get cached OCR result:', error);
      return null;
    }
  }

  // Cache transcription results
  async cacheTranscription(
    videoId: string,
    transcript: string,
    confidence: number,
    ttl: number = 86400 // 24 hours
  ): Promise<void> {
    if (!this.isAvailable()) return;

    try {
      const key = `transcription:${videoId}`;
      await this.redis.setex(key, ttl, JSON.stringify({
        transcript,
        confidence,
        timestamp: Date.now(),
      }));
    } catch (error) {
      console.error('Failed to cache transcription:', error);
    }
  }

  // Get cached transcription
  async getCachedTranscription(videoId: string): Promise<{
    transcript: string;
    confidence: number;
  } | null> {
    if (!this.isAvailable()) return null;

    try {
      const key = `transcription:${videoId}`;
      const cached = await this.redis.get(key);
      
      if (cached) {
        const data = JSON.parse(cached);
        return {
          transcript: data.transcript,
          confidence: data.confidence,
        };
      }
      
      return null;
    } catch (error) {
      console.error('Failed to get cached transcription:', error);
      return null;
    }
  }

  // Cache user activity
  async cacheUserActivity(
    userId: string,
    activity: any,
    ttl: number = 3600 // 1 hour
  ): Promise<void> {
    if (!this.isAvailable()) return;

    try {
      const key = `activity:${userId}:${Date.now()}`;
      await this.redis.setex(key, ttl, JSON.stringify({
        ...activity,
        timestamp: Date.now(),
      }));
    } catch (error) {
      console.error('Failed to cache user activity:', error);
    }
  }

  // Get user activity history
  async getUserActivityHistory(
    userId: string,
    limit: number = 100
  ): Promise<any[]> {
    if (!this.isAvailable()) return [];

    try {
      const pattern = `activity:${userId}:*`;
      const keys = await this.redis.keys(pattern);
      
      if (keys.length === 0) return [];

      // Sort by timestamp (newest first)
      keys.sort((a: any, b: any) => {
        const timestampA = parseInt(a.split(':')[2]);
        const timestampB = parseInt(b.split(':')[2]);
        return timestampB - timestampA;
      });

      // Get limited number of activities
      const limitedKeys = keys.slice(0, limit);
      const activities = await this.redis.mget(...limitedKeys);
      
      return activities
        .filter((activity: any) => activity !== null)
        .map((activity: any) => JSON.parse(activity!));
    } catch (error) {
      console.error('Failed to get user activity history:', error);
      return [];
    }
  }

  // Clear cache for specific user
  async clearUserCache(userId: string): Promise<void> {
    if (!this.isAvailable()) return;

    try {
      const patterns = [
        `chat:${userId}:*`,
        `session:${userId}`,
        `activity:${userId}:*`,
      ];

      for (const pattern of patterns) {
        const keys = await this.redis.keys(pattern);
        if (keys.length > 0) {
          await this.redis.del(...keys);
        }
      }
    } catch (error) {
      console.error('Failed to clear user cache:', error);
    }
  }

  // Clear all cache
  async clearAllCache(): Promise<void> {
    if (!this.isAvailable()) return;

    try {
      await this.redis.flushall();
    } catch (error) {
      console.error('Failed to clear all cache:', error);
    }
  }

  // Get cache statistics
  async getCacheStats(): Promise<{
    totalKeys: number;
    memoryUsage: string;
    connectedClients: number;
  }> {
    if (!this.isAvailable()) {
      return {
        totalKeys: 0,
        memoryUsage: '0B',
        connectedClients: 0,
      };
    }

    try {
      const info = await this.redis.info('memory');
      const keyspace = await this.redis.info('keyspace');
      const clients = await this.redis.info('clients');

      const totalKeys = await this.redis.dbsize();
      const memoryUsage = this.parseMemoryUsage(info);
      const connectedClients = this.parseConnectedClients(clients);

      return {
        totalKeys,
        memoryUsage,
        connectedClients,
      };
    } catch (error) {
      console.error('Failed to get cache stats:', error);
      return {
        totalKeys: 0,
        memoryUsage: '0B',
        connectedClients: 0,
      };
    }
  }

  // Hash query for cache key
  private hashQuery(query: string): string {
    // Simple hash function for query
    let hash = 0;
    for (let i = 0; i < query.length; i++) {
      const char = query.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
  }

  // Parse memory usage from Redis info
  private parseMemoryUsage(info: string): string {
    const match = info.match(/used_memory_human:([^\r\n]+)/);
    return match ? match[1] : '0B';
  }

  // Parse connected clients from Redis info
  private parseConnectedClients(info: string): number {
    const match = info.match(/connected_clients:(\d+)/);
    return match ? parseInt(match[1]) : 0;
  }

  // Close Redis connection
  async close(): Promise<void> {
    try {
      await this.redis.quit();
      this.isConnected = false;
    } catch (error) {
      console.error('Failed to close Redis connection:', error);
    }
  }
}

// Export the service
export const redisCacheService = new RedisCacheService();
