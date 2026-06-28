export type ClipPayload = { start: number; duration: number; notes?: string }
export type SnipPayload = { text: string; codeLang?: string; source?: string }

const base = process.env.NEXT_PUBLIC_BASE_URL || ''

function devHeaders(): HeadersInit {
  const h: Record<string, string> = { 'Content-Type': 'application/json' }
  if (process.env.DEV_FORCE_IN_MEMORY === 'true') {
    h['X-Dev-Bypass'] = 'true'
  }
  return h
}

export async function createClip(videoId: string, payload: ClipPayload) {
  const res = await fetch(`${base}/api/video/${encodeURIComponent(videoId)}/clip`, {
    method: 'POST',
    headers: devHeaders(),
    body: JSON.stringify(payload),
  })
  if (!res.ok) throw new Error('Failed to create clip')
  return res.json()
}

export async function listClips(videoId: string) {
  const res = await fetch(`${base}/api/video/${encodeURIComponent(videoId)}/clip`, {
    method: 'GET',
    headers: devHeaders(),
  })
  if (!res.ok) throw new Error('Failed to list clips')
  return res.json()
}

export async function createSnip(payload: SnipPayload) {
  const res = await fetch(`${base}/api/snip`, {
    method: 'POST',
    headers: devHeaders(),
    body: JSON.stringify(payload),
  })
  if (!res.ok) throw new Error('Failed to create snip')
  return res.json()
}

export async function listSnips() {
  const res = await fetch(`${base}/api/snip`, { headers: devHeaders() })
  if (!res.ok) throw new Error('Failed to list snips')
  return res.json()
}

export async function getChapters(videoId: string) {
  const res = await fetch(`${base}/api/video/${encodeURIComponent(videoId)}/chapters`, {
    method: 'GET',
    headers: devHeaders(),
  })
  if (!res.ok) throw new Error('Failed to get chapters')
  return res.json()
}

export async function requestChapters(videoId: string) {
  const res = await fetch(`${base}/api/video/${encodeURIComponent(videoId)}/chapters`, {
    method: 'POST',
    headers: devHeaders(),
    body: JSON.stringify({})
  })
  if (!res.ok) throw new Error('Failed to generate chapters')
  return res.json()
}


