'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { BookOpen, CheckCircle2, Loader2, XCircle } from 'lucide-react'

type InviteCourse = { title: string; description?: string }

export default function CourseInvitePage() {
  const params = useParams<{ token: string }>()
  const router = useRouter()
  const [course, setCourse] = useState<InviteCourse | null>(null)
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [responding, setResponding] = useState(false)

  useEffect(() => {
    const token = params?.token
    if (!token) return
    fetch(`/api/course-invites/${encodeURIComponent(token)}`)
      .then(async (response) => ({ response, body: await response.json() }))
      .then(({ response, body }) => {
        if (!response.ok) throw new Error(body.error || 'This invitation is unavailable')
        setCourse(body.course)
      })
      .catch((error) => setMessage(error instanceof Error ? error.message : 'This invitation is unavailable'))
      .finally(() => setLoading(false))
  }, [params?.token])

  const respond = async (decision: 'accept' | 'decline') => {
    if (!params?.token) return
    setResponding(true)
    setMessage('')
    try {
      const response = await fetch(`/api/course-invites/${encodeURIComponent(params.token)}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ decision }),
      })
      const body = await response.json()
      if (!response.ok) throw new Error(response.status === 401 ? 'Please sign in, then open this invitation again.' : body.error || 'Unable to save your response')
      if (decision === 'accept') router.push('/workspace/courses')
      else setMessage('You declined this learning invitation. No course was added to your workspace.')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to save your response')
    } finally {
      setResponding(false)
    }
  }

  return <main className="flex min-h-screen items-center justify-center bg-black px-6 text-white"><section className="w-full max-w-xl rounded-3xl border border-white/10 bg-zinc-950 p-7 shadow-2xl"><BookOpen className="h-8 w-8 text-emerald-300" />{loading ? <div className="mt-6 flex items-center gap-2 text-zinc-400"><Loader2 className="h-4 w-4 animate-spin" />Loading invitation…</div> : course ? <><p className="mt-6 text-xs font-semibold uppercase tracking-[0.2em] text-emerald-200/70">ChatPye learning invitation</p><h1 className="mt-2 text-2xl font-semibold">{course.title}</h1>{course.description && <p className="mt-3 leading-6 text-zinc-400">{course.description}</p>}<p className="mt-5 rounded-xl border border-white/10 bg-white/[0.03] p-3 text-sm text-zinc-300">Accept to add this learning pathway to your workspace. You can decline without sharing any work.</p><div className="mt-6 flex flex-wrap gap-3"><button disabled={responding} onClick={() => void respond('accept')} className="inline-flex items-center gap-2 rounded-lg bg-emerald-400 px-4 py-2.5 text-sm font-semibold text-black disabled:opacity-50"><CheckCircle2 className="h-4 w-4" />Accept and open workspace</button><button disabled={responding} onClick={() => void respond('decline')} className="inline-flex items-center gap-2 rounded-lg border border-white/15 px-4 py-2.5 text-sm text-zinc-200 hover:bg-white/10 disabled:opacity-50"><XCircle className="h-4 w-4" />Decline</button></div></> : <><h1 className="mt-6 text-2xl font-semibold">Invitation unavailable</h1></>}{message && <p className="mt-5 text-sm text-zinc-400">{message}</p>}</section></main>
}
