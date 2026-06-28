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

const memory = new Map<string, Map<string, number>>()

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const videoId = searchParams.get('videoId') || ''
    const limit = Math.max(1, Math.min(20, Number(searchParams.get('limit') || '10')))
    if (!videoId) return NextResponse.json({ success: false, error: 'videoId required' }, { status: 400 })
    const key = `prompts:${videoId}`
    const redis = getRedis()
    if (redis) {
      try {
        const rows = await redis.zrevrange(key, 0, limit - 1, 'WITHSCORES')
        const results: Array<{ promptId: string; count: number }> = []
        for (let i = 0; i < rows.length; i += 2) {
          results.push({ promptId: rows[i] as string, count: Number(rows[i + 1]) })
        }
        return NextResponse.json({ success: true, results })
      } catch {}
    }

    // memory fallback
    const map = memory.get(key) || new Map<string, number>()
    const results = Array.from(map.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([promptId, count]) => ({ promptId, count }))
    return NextResponse.json({ success: true, results })
  } catch {
    return NextResponse.json({ success: false, error: 'bad request' }, { status: 400 })
  }
}


