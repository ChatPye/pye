'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowUpRight, BookOpen, Loader2 } from 'lucide-react'

type AssignedCourse = {
  id: string
  courseId: string
  courseTitle: string
  status: string
  progressPercent: number
  enrolledAt: string
}

export default function WorkspaceCoursesPage() {
  const [assigned, setAssigned] = useState<AssignedCourse[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    ;(async () => {
      try {
        const res = await fetch('/api/courses')
        if (res.ok) {
          const data = await res.json()
          setAssigned(data.assigned ?? [])
        }
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-zinc-400" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="mx-auto max-w-4xl px-6 py-12">
        <h1 className="text-2xl font-semibold">My courses</h1>
        <p className="mt-1 text-sm text-zinc-400">
          Courses assigned to you by your manager or HR
        </p>

        {assigned.length === 0 ? (
          <div className="mt-10 rounded-xl border border-zinc-800 bg-zinc-950 p-8 text-center">
            <BookOpen className="mx-auto h-8 w-8 text-zinc-600" />
            <p className="mt-4 text-zinc-400">No assigned courses yet.</p>
            <Link
              href="/workspace"
              className="mt-4 inline-block text-sm text-blue-400 hover:text-blue-300"
            >
              Upload a video to start self-directed learning
            </Link>
          </div>
        ) : (
          <ul className="mt-8 space-y-4">
            {assigned.map((item) => (
              <li
                key={item.id}
                className="rounded-xl border border-zinc-800 bg-zinc-950/80 p-5"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="font-medium">{item.courseTitle}</h2>
                    <p className="mt-1 text-xs text-zinc-500 capitalize">
                      {item.status.replace('_', ' ')} · Assigned{' '}
                      {new Date(item.enrolledAt).toLocaleDateString()}
                    </p>
                  </div>
                  <Link
                    href="/workspace"
                    className="inline-flex items-center gap-1 text-sm text-blue-400 hover:text-blue-300"
                  >
                    Open workspace
                    <ArrowUpRight className="h-3 w-3" />
                  </Link>
                </div>
                <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-zinc-800">
                  <div
                    className="h-full rounded-full bg-white transition-all"
                    style={{ width: `${item.progressPercent}%` }}
                  />
                </div>
                <p className="mt-1 text-xs text-zinc-500">{item.progressPercent}% complete</p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
