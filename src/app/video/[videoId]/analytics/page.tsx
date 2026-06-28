"use client"
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'

export default function VideoAnalyticsPublicPage() {
  const { videoId } = useParams<{ videoId: string }>()
  const [loading, setLoading] = useState(true)
  const [questions, setQuestions] = useState<Array<{ question: string; count: number }>>([])
  const [prompts, setPrompts] = useState<Array<{ promptId: string; count: number }>>([])

  useEffect(() => {
    let ignore = false
    ;(async () => {
      try {
        const [q, p] = await Promise.all([
          fetch(`/api/questions/top?videoId=${encodeURIComponent(videoId)}`),
          fetch(`/api/prompts/top?videoId=${encodeURIComponent(videoId)}`),
        ])
        const qd = await q.json(); const pd = await p.json()
        if (!ignore) { setQuestions(qd?.results || []); setPrompts(pd?.results || []) }
      } finally { if (!ignore) setLoading(false) }
    })()
    return () => { ignore = true }
  }, [videoId])

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 text-white">
      <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950 p-5 shadow-2xl mb-6">
        <h1 className="text-2xl font-semibold bg-clip-text text-transparent bg-gradient-to-r from-white to-white/70">Video analytics</h1>
        <p className="text-sm text-white/70">Completion, watch heatmap, prompts, questions, and submitted work.</p>
      </div>
      {loading ? (
        <div>Loading…</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4 shadow">
            <h2 className="font-semibold">Completion rate</h2>
            <div className="h-40 mt-3 rounded bg-white/5 flex items-center justify-center text-white/40">Chart (mock)</div>
          </div>
          <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4 shadow">
            <h2 className="font-semibold">Watch heatmap</h2>
            <div className="h-40 mt-3 rounded bg-white/5 flex items-center justify-center text-white/40">Heatmap (mock)</div>
          </div>
          <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4 shadow">
            <h2 className="font-semibold">Prompt analytics</h2>
            <ul className="mt-2 space-y-2 text-sm">
              {prompts.map((p) => (<li key={p.promptId} className="flex justify-between border-b border-white/5 py-1"><span>{p.promptId}</span><span className="text-white/50">{p.count}</span></li>))}
              {prompts.length===0 && <li className="text-white/50">No prompt activity</li>}
            </ul>
          </div>
          <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4 shadow">
            <h2 className="font-semibold">Most asked questions</h2>
            <ul className="mt-2 space-y-2 text-sm">
              {questions.map((q, i) => (<li key={i} className="border-b border-white/5 py-1"><div>{q.question}</div><div className="text-white/50 text-[12px]">{q.count} times</div></li>))}
              {questions.length===0 && <li className="text-white/50">No questions yet</li>}
            </ul>
          </div>
          <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4 md:col-span-2 shadow">
            <h2 className="font-semibold">Submitted work</h2>
            <div className="mt-2 h-40 rounded bg-white/5 flex items-center justify-center text-white/40">Links/list (mock)</div>
          </div>
        </div>
      )}
    </div>
  )
}


