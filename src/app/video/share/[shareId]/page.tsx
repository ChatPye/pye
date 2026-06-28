"use client"
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'

export default function SharedVideoRedirect() {
  const params = useParams<{ shareId: string }>()
  const router = useRouter()
  const [status, setStatus] = useState<'loading'|'auth'|'notfound'|'ready'>('loading')
  const [videoId, setVideoId] = useState<string>('')

  useEffect(() => {
    const run = async () => {
      try {
        const res = await fetch(`/api/video/share/${params.shareId}`)
        if (res.status === 401) { setStatus('auth'); return }
        if (!res.ok) { setStatus('notfound'); return }
        const data = await res.json()
        if (data?.videoId) {
          setVideoId(data.videoId)
          setStatus('ready')
          router.replace(`/workspace?videoId=${encodeURIComponent(data.videoId)}&shared=${encodeURIComponent(params.shareId)}`)
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
  if (status === 'auth') return (
    <div className="p-8 text-white">
      <p className="mb-3">Sign in to access this shared video page.</p>
      <Link href="/sign-in" className="text-blue-400 underline">Sign in</Link>
    </div>
  )
  if (status === 'notfound') return <div className="p-8 text-white">This share link is invalid or expired.</div>
  return <div className="p-8 text-white">Redirecting to video {videoId}…</div>
}


