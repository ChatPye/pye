import { NextResponse } from 'next/server'

const memory = new Map<string, { data: any; ts: number }>()
const TTL_MS = 10 * 60 * 1000

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const videoId = searchParams.get('videoId')
    if (!videoId) {
      return NextResponse.json({ error: 'videoId required' }, { status: 400 })
    }
    const cacheKey = `yt:oembed:${videoId}`
    const now = Date.now()
    const cached = memory.get(cacheKey)
    if (cached && now - cached.ts < TTL_MS) {
      return NextResponse.json(cached.data)
    }
    const ytUrl = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${encodeURIComponent(videoId)}&format=json`
    const res = await fetch(ytUrl, { headers: { 'User-Agent': 'ChatPye/1.0' }, cache: 'no-store' })
    if (!res.ok) {
      return NextResponse.json({ error: 'oEmbed fetch failed' }, { status: 502 })
    }
    const data = await res.json()
    const payload = {
      title: data.title,
      author: data.author_name,
      thumbnail: data.thumbnail_url,
      provider: data.provider_name,
      html: data.html,
      url: `https://www.youtube.com/watch?v=${videoId}`,
    }
    memory.set(cacheKey, { data: payload, ts: now })
    return NextResponse.json(payload)
  } catch (err) {
    return NextResponse.json({ error: 'unexpected error' }, { status: 500 })
  }
}


