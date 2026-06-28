import { logger } from '@/lib/logger'

export interface YouTubeMetadata {
  title?: string
  author?: string
  description?: string
  thumbnail?: string
  publishedAt?: string
  durationSeconds?: number
}

function parseISODurationToSeconds(duration: string | undefined): number | undefined {
  if (!duration) return undefined
  const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/)
  if (!match) return undefined
  const hours = match[1] ? parseInt(match[1], 10) : 0
  const minutes = match[2] ? parseInt(match[2], 10) : 0
  const seconds = match[3] ? parseInt(match[3], 10) : 0
  return hours * 3600 + minutes * 60 + seconds
}

export async function fetchYouTubeMetadata(videoId: string): Promise<YouTubeMetadata> {
  const result: YouTubeMetadata = {}
  const apiKey = process.env.YOUTUBE_API_KEY

  if (apiKey) {
    try {
      const apiUrl = `https://www.googleapis.com/youtube/v3/videos?id=${encodeURIComponent(videoId)}&part=snippet,contentDetails&key=${apiKey}`
      const apiRes = await fetch(apiUrl, { cache: 'no-store' })
      if (apiRes.ok) {
        const payload = await apiRes.json()
        const item = payload.items?.[0]
        if (item?.snippet) {
          result.title = item.snippet.title || result.title
          result.author = item.snippet.channelTitle || result.author
          result.description = item.snippet.description || result.description
          result.thumbnail = item.snippet.thumbnails?.high?.url || item.snippet.thumbnails?.default?.url || result.thumbnail
          result.publishedAt = item.snippet.publishedAt || result.publishedAt
        }
        if (item?.contentDetails?.duration) {
          result.durationSeconds = parseISODurationToSeconds(item.contentDetails.duration) ?? result.durationSeconds
        }
      } else {
        const errorText = await apiRes.text()
        logger.warn('YouTube API metadata fetch failed', { videoId, status: apiRes.status, error: errorText })
      }
    } catch (error) {
      logger.error('YouTube API metadata fetch error', error instanceof Error ? error : new Error(String(error)), { videoId })
    }
  }

  if (!result.title || !result.thumbnail) {
    try {
      const oembedUrl = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${encodeURIComponent(videoId)}&format=json`
      const res = await fetch(oembedUrl, { headers: { 'User-Agent': 'ChatPye/1.0' }, cache: 'no-store' })
      if (res.ok) {
        const data = await res.json()
        result.title = result.title || data.title
        result.author = result.author || data.author_name
        result.thumbnail = result.thumbnail || data.thumbnail_url
      } else {
        logger.warn('YouTube oEmbed fetch failed', { videoId, status: res.status })
      }
    } catch (error) {
      logger.error('YouTube oEmbed fetch error', error instanceof Error ? error : new Error(String(error)), { videoId })
    }
  }

  result.thumbnail = result.thumbnail || `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`
  return result
}
