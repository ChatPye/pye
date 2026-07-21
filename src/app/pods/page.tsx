'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'

type Pod = { id: string; title: string; description?: string; memberIds?: string[]; videos?: string[]; skills?: string[] }

export default function PodsPage() {
  const [pods, setPods] = useState<Pod[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch('/api/pods', { credentials: 'include' })
      .then(async (response) => {
        const body = await response.json()
        if (!response.ok) throw new Error(body.error || 'Unable to load Pods')
        setPods(body.pods ?? [])
      })
      .catch((reason) => setError(reason instanceof Error ? reason.message : 'Unable to load Pods'))
      .finally(() => setLoading(false))
  }, [])

  return <main className="min-h-screen bg-zinc-950 px-5 py-10 text-white sm:px-8">
    <section className="mx-auto max-w-5xl">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-violet-300">SkillProof Studio</p>
          <h1 className="mt-2 text-3xl font-semibold">Your Learning Pods</h1>
          <p className="mt-2 max-w-xl text-sm text-zinc-400">Group videos, practical work and evidence into a shared learning pathway.</p>
        </div>
        <Link href="/pods/new" className="rounded-xl bg-violet-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-violet-400">Create a Pod</Link>
      </div>
      {loading && <p className="text-sm text-zinc-400">Loading your Pods…</p>}
      {error && <div className="rounded-xl border border-rose-400/30 bg-rose-500/10 p-4 text-sm text-rose-200">{error}</div>}
      {!loading && !error && !pods.length && <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-8 text-center"><h2 className="font-medium">Create your first learning Pod</h2><p className="mt-2 text-sm text-zinc-400">Add a tutorial, invite learners, then review the evidence they create.</p><Link href="/pods/new" className="mt-5 inline-block text-sm text-violet-300 underline">Create a Pod</Link></div>}
      <div className="grid gap-4 md:grid-cols-2">
        {pods.map((pod) => <Link key={pod.id} href={`/pods/${encodeURIComponent(pod.id)}`} className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 transition hover:border-violet-400/50 hover:bg-white/[0.05]"><p className="text-lg font-medium">{pod.title}</p><p className="mt-2 min-h-10 text-sm text-zinc-400">{pod.description || 'A practical, evidence-based learning pathway.'}</p><div className="mt-4 flex gap-3 text-xs text-zinc-500"><span>{pod.videos?.length ?? 0} videos</span><span>{pod.memberIds?.length ?? 0} learners</span><span>{pod.skills?.slice(0, 2).join(' · ') || 'Skills in progress'}</span></div></Link>)}
      </div>
    </section>
  </main>
}
