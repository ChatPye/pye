import { NextResponse } from 'next/server'
import Redis from 'ioredis'

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

const memory = new Map<string, { data: any; ts: number }>()
const TTL_SECONDS = 10 * 60
const TTL_MS = TTL_SECONDS * 1000

export async function GET(_req: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params
  if (!id) return NextResponse.json({ error: 'video id required' }, { status: 400 })
  const cacheKey = `meta:${id}`

  // Try Redis cache
  const redis = getRedis()
  if (redis) {
    try {
      const cached = await redis.get(cacheKey)
      if (cached) {
        return NextResponse.json(JSON.parse(cached))
      }
    } catch {}
  } else {
    const cached = memory.get(cacheKey)
    if (cached && Date.now() - cached.ts < TTL_MS) {
      return NextResponse.json(cached.data)
    }
  }

  // Dev: return mock AI metadata
  if (process.env.DEV_FORCE_IN_MEMORY === 'true' || !process.env.DOCUMENTDB_URI) {
    const payload = {
      title: `AI summary for ${id}`,
      description: 'Auto-generated summary based on transcript content. This is a development mock.',
    }
    if (redis) {
      try { await redis.setex(cacheKey, TTL_SECONDS, JSON.stringify(payload)) } catch {}
    } else {
      memory.set(cacheKey, { data: payload, ts: Date.now() })
    }
    return NextResponse.json(payload)
  }

  // TODO: In production, fetch transcript and run AI model to create title/description
  const payload = {
    title: `Learning session ${id}`,
    description: 'Summary will be generated from transcript in production.',
  }
  if (redis) {
    try { await redis.setex(cacheKey, TTL_SECONDS, JSON.stringify(payload)) } catch {}
  } else {
    memory.set(cacheKey, { data: payload, ts: Date.now() })
  }
  return NextResponse.json(payload)
}


