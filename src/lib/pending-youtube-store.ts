import { extractYouTubeVideoId } from '@/lib/youtube'

const KEY = 'chatpye_pending_youtube_url'

export function savePendingYouTubeUrl(url: string): boolean {
  if (typeof window === 'undefined' || !extractYouTubeVideoId(url)) return false
  try { sessionStorage.setItem(KEY, url.trim()); return true } catch { return false }
}

export function consumePendingYouTubeUrl(): string | null {
  if (typeof window === 'undefined') return null
  try {
    const value = sessionStorage.getItem(KEY)
    sessionStorage.removeItem(KEY)
    return value && extractYouTubeVideoId(value) ? value : null
  } catch { return null }
}

export function hasPendingYouTubeUrl(): boolean {
  if (typeof window === 'undefined') return false
  try { return Boolean(sessionStorage.getItem(KEY)) } catch { return false }
}
