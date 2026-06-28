"use client"
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'

export default function SharedPodRedirect() {
  const params = useParams<{ shareId: string }>()
  const router = useRouter()
  const [status, setStatus] = useState<'loading'|'auth'|'notfound'|'ready'>('loading')
  const [podId, setPodId] = useState('')

  useEffect(() => {
    const run = async () => {
      try {
        const res = await fetch(`/api/pods/share/${params.shareId}`)
        if (res.status === 401) { setStatus('auth'); return }
        if (!res.ok) { setStatus('notfound'); return }
        const data = await res.json()
        if (data?.podId) {
          setPodId(data.podId)
          setStatus('ready')
          router.replace(`/pods/${encodeURIComponent(data.podId)}?shared=${encodeURIComponent(params.shareId)}`)
        } else {
          setStatus('notfound')
        }
      } catch {
        setStatus('notfound')
      }
    }
    run()
  }, [params.shareId, router])

  if (status === 'loading') return <div className="p-8 text-white">Loading…</div>
  if (status === 'auth') return <div className="p-8 text-white">Sign in required</div>
  if (status === 'notfound') return <div className="p-8 text-white">This share link is invalid or expired.</div>
  return <div className="p-8 text-white">Redirecting to pod {podId}…</div>
}


