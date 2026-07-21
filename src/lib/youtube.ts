/** Extract a canonical public YouTube video id from the URLs learners paste. */
export function extractYouTubeVideoId(value: string): string | null {
  const input = value.trim()
  if (!input) return null
  try {
    const url = new URL(input.startsWith('http') ? input : `https://${input}`)
    const host = url.hostname.replace(/^www\./, '').toLowerCase()
    let candidate: string | null = null
    if (host === 'youtu.be') candidate = url.pathname.split('/').filter(Boolean)[0] || null
    if (host.endsWith('youtube.com')) {
      candidate = url.searchParams.get('v') || url.pathname.match(/^\/(?:embed|shorts|live)\/([^/?#]+)/)?.[1] || null
    }
    return candidate && /^[A-Za-z0-9_-]{11}$/.test(candidate) ? candidate : null
  } catch { return null }
}

export function youtubeWatchUrl(videoId: string): string {
  return `https://www.youtube.com/watch?v=${encodeURIComponent(videoId)}`
}
