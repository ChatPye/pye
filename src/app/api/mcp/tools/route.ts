'use server'

import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { connectDocumentDB } from '@/server/db/documentdb'
import { VideoProcess } from '@/data/models/VideoProcess'
import Redis from 'ioredis'
import { logger } from '@/lib/logger'

// Simple in-memory cache (fallback if Redis unavailable)
const queryCache = new Map<string, { data: any; timestamp: number }>()
const CACHE_TTL = 5 * 60 * 1000 // 5 minutes

function getCacheKey(videoId: string, tool: string, query?: string): string {
  return `${videoId}:${tool}:${query || ''}`
}

// Redis client singleton
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

async function getCachedResult(key: string): Promise<any | null> {
  const redis = getRedis()
  if (redis) {
    try {
      const raw = await redis.get(key)
      if (!raw) return null
      return JSON.parse(raw)
    } catch {
      // fall through to memory cache
    }
  }
  const cached = queryCache.get(key)
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data
  }
  queryCache.delete(key)
  return null
}

async function setCachedResult(key: string, data: any): Promise<void> {
  const redis = getRedis()
  if (redis) {
    try {
      await redis.setex(key, Math.floor(CACHE_TTL / 1000), JSON.stringify(data))
      return
    } catch {
      // fall back to memory cache
    }
  }
  queryCache.set(key, { data, timestamp: Date.now() })
}

type ToolRequest = {
  videoId?: string
  tool?: 'searchTranscript' | 'summarize' | 'extractClip'
  query?: string
  start?: number
  duration?: number
}

export async function POST(request: NextRequest) {
  try {
    const useMemory = process.env.DEV_FORCE_IN_MEMORY === 'true' || !process.env.DOCUMENTDB_URI
    if (!useMemory) {
      await requireAuth()
    }
    const body = (await request.json()) as ToolRequest
    const { videoId, tool, query } = body

    if (!videoId || !tool) {
      return NextResponse.json({ success: false, error: 'videoId and tool are required' }, { status: 400 })
    }

    // Check cache first
    const cacheKey = getCacheKey(videoId, tool, query)
    const cachedResult = await getCachedResult(cacheKey)
    if (cachedResult) {
      return NextResponse.json({ success: true, ...cachedResult, cached: true })
    }

    let record: any = null
    if (!useMemory) {
      await connectDocumentDB()
      record = await VideoProcess.findOne({ videoId })
      if (!record) {
        return NextResponse.json({ success: false, error: 'Video not found' }, { status: 404 })
      }
    } else {
      // Minimal mock when in-memory mode: just enough for search/summarize
      record = {
        videoId,
        transcript: [
          { text: 'Intro to topic and goals', start: 0, duration: 60 },
          { text: 'Core concept explained with examples', start: 120, duration: 120 },
          { text: 'Summary and next steps', start: 420, duration: 90 },
        ],
        keyPoints: ['intro', 'concept', 'summary'],
      }
    }

    // Ensure we only process the specific video's content
    if (record.videoId !== videoId) {
      return NextResponse.json({ success: false, error: 'Video ID mismatch' }, { status: 400 })
    }

    switch (tool) {
      case 'searchTranscript': {
        const q = (body.query || '').trim().toLowerCase()
        if (!q) return NextResponse.json({ success: true, results: [] })

        // Use VectorSearchService for semantic search
        const { VectorSearchService } = await import('@/services/vector-search');
        const results = await VectorSearchService.searchTranscript(videoId, q);

        await setCachedResult(cacheKey, { results })
        return NextResponse.json({ success: true, results })
      }
      case 'summarize': {
        const text = (record.transcript || []).map((s: any) => s.text).join(' ')

        // Use LLMService for intelligent summarization
        const { LLMService } = await import('@/services/llm');
        let summary;
        try {
          // Limit text length to avoid token limits (approx 25k chars ~ 6k tokens)
          const truncatedText = text.length > 25000 ? text.slice(0, 25000) + "..." : text;
          summary = await LLMService.summarize(truncatedText);
        } catch (err) {
          logger.error('Summarization failed, falling back to simple truncation', err as Error);
          summary = text.length > 600 ? `${text.slice(0, 600)}...` : text;
        }

        const keyPoints = (record.keyPoints || []).slice(0, 5)
        const result = { summary, keyPoints }
        await setCachedResult(cacheKey, result)
        return NextResponse.json({ success: true, ...result })
      }
      case 'extractClip': {
        const start = Math.max(0, Math.floor(body.start || 0))
        const duration = Math.max(1, Math.floor(body.duration || 30))
        // In a future version, request a job to cut clip via worker/FFmpeg
        return NextResponse.json({ success: true, clip: { start, duration, url: null } })
      }
      default:
        return NextResponse.json({ success: false, error: 'Unknown tool' }, { status: 400 })
    }
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }
}


