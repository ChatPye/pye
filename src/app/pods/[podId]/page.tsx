"use client"
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'

export default function PodPlaylistPage() {
  const params = useParams<{ podId: string }>()
  const router = useRouter()
  const [pod, setPod] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [shareUrl, setShareUrl] = useState<string>('')
  const [access, setAccess] = useState<'public'|'invite'>('public')
  const [toast, setToast] = useState('')
  const [showLearners, setShowLearners] = useState(false)
  const [videos, setVideos] = useState<string[]>([])

  useEffect(() => {
    let ignore = false
    ;(async () => {
      try {
        const res = await fetch(`/api/pods/${params.podId}`)
        const data = await res.json()
        if (!ignore) {
          setPod(data?.pod || null)
          setVideos((data?.pod?.videos as string[]) || [])
        }
      } finally {
        if (!ignore) setLoading(false)
      }
    })()
    return () => { ignore = true }
  }, [params.podId])

  const show = (t: string) => { setToast(t); setTimeout(() => setToast(''), 1500) }

  const createShare = async () => {
    try {
      const res = await fetch('/api/pods/share', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ podId: params.podId, access }) })
      if (res.status === 402) { show('Invite limit reached — upgrade required'); return }
      const data = await res.json()
      if (data?.shareUrl) { setShareUrl(data.shareUrl); await navigator.clipboard?.writeText(data.shareUrl); show('Share link copied') }
    } catch { show('Share failed') }
  }

  const moveVideo = async (index: number, direction: -1 | 1) => {
    const target = index + direction
    if (target < 0 || target >= videos.length) return
    const next = videos.slice()
    const tmp = next[index]
    next[index] = next[target]
    next[target] = tmp
    setVideos(next)
    
    // Persist reordering
    try {
      await fetch(`/api/pods/${params.podId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ videos: next })
      })
    } catch (error) {
      console.error('Failed to save video order:', error)
      // Revert on error
      setVideos(videos)
    }
  }

  if (loading) return <div className="p-8 text-white">Loading…</div>
  if (!pod) return <div className="p-8 text-white">Pod not found</div>

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 text-white">
      <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950 p-5 shadow-2xl">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.35em] text-white/40">Learning Pod</p>
          <h1 className="text-2xl font-semibold bg-clip-text text-transparent bg-gradient-to-r from-white to-white/70">{pod.title || pod.name}</h1>
          {pod.description && <p className="text-sm text-white/70 mt-1 max-w-2xl">{pod.description}</p>}
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 text-[11px] text-white/70">
            <span>Share:</span>
            <button onClick={() => setAccess('public')} className={`px-2 py-1 rounded border ${access==='public'?'border-blue-400/60 bg-blue-400/15 text-blue-100':'border-white/10 bg-white/5 text-white/60'}`}>Public</button>
            <button onClick={() => setAccess('invite')} className={`px-2 py-1 rounded border ${access==='invite'?'border-amber-400/60 bg-amber-400/15 text-amber-100':'border-white/10 bg-white/5 text-white/60'}`}>Invite-only</button>
          </div>
          <button onClick={createShare} className="px-3 py-2 rounded-xl border border-purple-400/40 bg-purple-400/15 text-purple-100 hover:border-purple-300 shadow">Create Link</button>
          <Link href={`/admin/analytics/pod/${encodeURIComponent(pod.id)}`} className="px-3 py-2 rounded-xl border border-fuchsia-400/40 bg-fuchsia-400/15 text-fuchsia-100 hover:border-fuchsia-300 shadow">Analytics</Link>
        </div>
      </div>
      {toast && <div className="mt-2 text-[12px] text-emerald-300">{toast}</div>}
      </div>

      <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">Playlist</h2>
            <div className="text-xs text-white/60">Drag coming soon; use arrows to reorder</div>
          </div>
          {videos.map((v: string, i: number) => (
            <div key={`${v}_${i}`} className="rounded-xl border border-white/10 bg-white/[0.03] hover:bg-white/[0.05] transition p-3 flex items-center gap-3">
              <div className="w-8 h-8 rounded bg-white/10" />
              <div className="flex-1 min-w-0">
                <div className="text-sm truncate text-white/90">{v}</div>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => moveVideo(i, -1)} className="px-2 py-1 text-[12px] rounded-lg border border-white/10 hover:border-white/20">↑</button>
                <button onClick={() => moveVideo(i, 1)} className="px-2 py-1 text-[12px] rounded-lg border border-white/10 hover:border-white/20">↓</button>
                <Link href={`/workspace?videoId=${encodeURIComponent(v)}`} className="text-[12px] text-blue-400">Open</Link>
              </div>
            </div>
          ))}
        </div>
        <div className="space-y-4">
          <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3">
            <h3 className="font-semibold">Skills Pathway</h3>
            <ul className="mt-2 list-disc list-inside text-sm text-white/70">
              {(pod.skills || []).map((s: string, i: number) => (<li key={i}>{s}</li>))}
            </ul>
          </div>
          <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3">
            <h3 className="font-semibold">Rewards</h3>
            <ul className="mt-2 list-disc list-inside text-sm text-white/70">
              {(pod.rewards || []).map((r: string, i: number) => (<li key={i}>{r}</li>))}
            </ul>
          </div>
          <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">Learners</h3>
              <button onClick={() => setShowLearners(!showLearners)} className="text-[12px] text-blue-400">{showLearners ? 'Hide' : 'Show'}</button>
            </div>
            {showLearners && (
              <ul className="mt-2 space-y-2 text-sm text-white/80">
                {(pod.memberIds || []).slice(0, 20).map((m: string, i: number) => (
                  <li key={i} className="flex items-center justify-between border-b border-white/5 py-1">
                    <span>{m}</span>
                    <span className="text-white/50 text-[12px]">Member</span>
                  </li>
                ))}
                {(!pod.memberIds || pod.memberIds.length === 0) && (
                  <li className="text-white/50">No learners yet.</li>
                )}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
