"use client"
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'

type PromptItem = { promptId: string; count: number }
type QuestionItem = { question: string; count: number }

export default function VideoAnalyticsPage() {
  const params = useParams<{ videoId: string }>()
  const videoId = params?.videoId
  const [prompts, setPrompts] = useState<PromptItem[]>([])
  const [questions, setQuestions] = useState<QuestionItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!videoId) return
    let ignore = false
    ;(async () => {
      try {
        const [pRes, qRes] = await Promise.all([
          fetch(`/api/prompts/top?videoId=${encodeURIComponent(videoId)}&limit=10`),
          fetch(`/api/questions/top?videoId=${encodeURIComponent(videoId)}&limit=10`),
        ])
        const pData = await pRes.json()
        const qData = await qRes.json()
        if (!ignore) {
          setPrompts(pData?.results || [])
          setQuestions(qData?.results || [])
        }
      } finally {
        if (!ignore) setLoading(false)
      }
    })()
    return () => { ignore = true }
  }, [videoId])

  if (!videoId) return <div className="p-6 text-white">Missing videoId</div>

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 text-white">
      <h1 className="text-2xl font-semibold mb-2">Video analytics</h1>
      <p className="text-sm text-zinc-400 mb-6">Top prompts and most asked questions for this video.</p>
      {loading ? (
        <div className="text-zinc-400">Loading…</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="rounded-xl border border-white/10 bg-black/60 p-4">
            <h2 className="font-semibold mb-3">Top prompt chips</h2>
            {prompts.length === 0 ? (
              <p className="text-zinc-400 text-sm">No prompt activity yet.</p>
            ) : (
              <ul className="space-y-2 text-sm">
                {prompts.map((p) => (
                  <li key={p.promptId} className="flex items-center justify-between border-b border-white/5 py-2">
                    <span className="text-zinc-200">{p.promptId}</span>
                    <span className="text-zinc-400">{p.count}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="rounded-xl border border-white/10 bg-black/60 p-4">
            <h2 className="font-semibold mb-3">Most asked questions</h2>
            {questions.length === 0 ? (
              <p className="text-zinc-400 text-sm">No questions recorded yet.</p>
            ) : (
              <ul className="space-y-2 text-sm">
                {questions.map((q, idx) => (
                  <li key={idx} className="border-b border-white/5 py-2">
                    <div className="text-zinc-200">{q.question}</div>
                    <div className="text-zinc-500 text-xs">{q.count} times</div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  )
}


