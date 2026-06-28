import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { VectorSearchService } from '@/services/vector-search'
import Redis from 'ioredis'

// Redis cache (fallback to in-memory if not configured)
const CACHE_TTL = 5 * 60 // seconds
let redisClient: Redis | null | undefined
function getRedis(): Redis | null {
  if (redisClient !== undefined) return redisClient
  const url = process.env.REDIS_URL
  if (!url) {
    redisClient = null
    return redisClient
  }
  try {
    redisClient = new Redis(url, { maxRetriesPerRequest: 1, enableOfflineQueue: false })
    return redisClient
  } catch {
    redisClient = null
    return redisClient
  }
}

function getCacheKey(videoId: string, query: string): string {
  return `rag:${videoId}:${query.toLowerCase()}`
}

export async function POST(request: NextRequest) {
  try {
    const useMemory = process.env.DEV_FORCE_IN_MEMORY === 'true'
    if (!useMemory) {
      await requireAuth()
    }
    const body = await request.json()
    const { videoId, query } = body as { videoId?: string; query?: string }
    if (!videoId || !query) {
      return NextResponse.json({ success: false, error: 'videoId and query are required' }, { status: 400 })
    }

    try {
      const results = await VectorSearchService.searchTranscript(videoId, query)

      // Cache results (optional, can add Redis back if needed)
      const cacheKey = getCacheKey(videoId, query)
      const redis = getRedis()
      if (redis) {
        try {
          await redis.setex(cacheKey, CACHE_TTL, JSON.stringify(results))
        } catch { }
      }

      return NextResponse.json({ success: true, results })
    } catch (e) {
      console.error('RAG query error:', e);
      return NextResponse.json({ success: true, results: [] })
    }
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }
}


