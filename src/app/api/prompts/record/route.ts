import { NextRequest, NextResponse } from 'next/server'
import Redis from 'ioredis'

let redisClient: Redis | null | undefined
function getRedis(): Redis | null {
  if (redisClient !== undefined) return redisClient
  const url = process.env.REDIS_URL
  if (!url) { redisClient = null; return redisClient }
  try {
    redisClient = new Redis(url, { maxRetriesPerRequest: 1, enableOfflineQueue: false })
    return redisClient
  } catch {
    redisClient = null
    return redisClient
  }
}

const memory = new Map<string, number>()

export async function POST(request: NextRequest) {
  try {
    const { videoId, promptId, text } = await request.json()
    if (!videoId || (!promptId && !text)) {
      return NextResponse.json({ success: false, error: 'videoId and promptId/text required' }, { status: 400 })
    }
    const key = `prompts:${videoId}`
    const field = promptId || (text as string).slice(0, 64)

    const redis = getRedis()
    if (redis) {
      try {
        await redis.zincrby(key, 1, field)
        await redis.expire(key, 60 * 60 * 24 * 7) // 7 days
        return NextResponse.json({ success: true })
      } catch {}
    }
    const memKey = `${key}:${field}`
    memory.set(memKey, (memory.get(memKey) || 0) + 1)
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ success: false, error: 'bad request' }, { status: 400 })
  }
}


