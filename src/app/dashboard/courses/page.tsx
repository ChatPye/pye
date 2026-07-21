'use client'

import { FormEvent, useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Link2, Loader2, Plus, Send } from 'lucide-react'

type Course = {
  id: string
  title: string
  description?: string
  published: boolean
  enrollmentCount?: number
}

export default function CoursesManagementPage() {
  const [courses, setCourses] = useState<Course[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [creating, setCreating] = useState(false)
  const [assignCourseId, setAssignCourseId] = useState<string | null>(null)
  const [assignEmails, setAssignEmails] = useState('')
  const [assigning, setAssigning] = useState(false)
  const [message, setMessage] = useState('')

  const handleShareLink = async (courseId: string) => {
    setMessage('')
    try {
      const response = await fetch(`/api/courses/${courseId}/share`, { method: 'POST' })
      const data = await response.json()
      if (!response.ok || !data.shareUrl) throw new Error(data.error || 'Unable to create learner link')
      await navigator.clipboard.writeText(data.shareUrl)
      setMessage('Learner link copied — recipients can accept or decline it.')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to create learner link')
    }
  }

  const loadCourses = async () => {
    const res = await fetch('/api/courses')
    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      throw new Error(body.error || 'Failed to load courses')
    }
    const data = await res.json()
    setCourses(data.courses ?? [])
  }

  useEffect(() => {
    ;(async () => {
      try {
        await loadCourses()
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load')
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return
    setCreating(true)
    setMessage('')
    try {
      const res = await fetch('/api/courses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, description, published: true }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Create failed')
      setTitle('')
      setDescription('')
      setMessage(`Created "${data.course.title}"`)
      await loadCourses()
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Create failed')
    } finally {
      setCreating(false)
    }
  }

  const handleAssign = async (courseId: string) => {
    const emails = assignEmails
      .split(/[,;\n]/)
      .map((s) => s.trim())
      .filter(Boolean)
    if (emails.length === 0) {
      setMessage('Enter at least one email address')
      return
    }
    setAssigning(true)
    setMessage('')
    try {
      const res = await fetch(`/api/courses/${courseId}/assign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emails }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Assign failed')
      setMessage(`Assigned ${data.enrollments?.length ?? 0} learner(s)`)
      setAssignEmails('')
      setAssignCourseId(null)
      await loadCourses()
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Assign failed')
    } finally {
      setAssigning(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-zinc-400" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="mx-auto max-w-4xl px-6 py-10">
        <Link
          href="/dashboard/hr"
          className="inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-300"
        >
          <ArrowLeft className="h-4 w-4" />
          HR Dashboard
        </Link>
        <h1 className="mt-2 text-2xl font-semibold">Courses</h1>
        <p className="text-sm text-zinc-400">Create training courses and assign them to your team</p>

        {error && (
          <p className="mt-4 rounded-lg border border-rose-900/50 bg-rose-950/30 px-4 py-3 text-sm text-rose-300">
            {error}
          </p>
        )}

        {message && !error && (
          <p className="mt-4 rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-3 text-sm text-zinc-300">
            {message}
          </p>
        )}

        <form onSubmit={handleCreate} className="mt-8 rounded-xl border border-zinc-800 bg-zinc-950 p-5 space-y-4">
          <h2 className="font-medium flex items-center gap-2">
            <Plus className="h-4 w-4" />
            New course
          </h2>
          <input
            type="text"
            placeholder="Course title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm"
          />
          <textarea
            placeholder="Description (optional)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm"
          />
          <button
            type="submit"
            disabled={creating || !title.trim()}
            className="rounded-lg bg-white px-4 py-2 text-sm font-medium text-black hover:bg-zinc-100 disabled:opacity-50"
          >
            {creating ? 'Creating…' : 'Create course'}
          </button>
        </form>

        <section className="mt-8 space-y-4">
          <h2 className="font-medium">Your courses</h2>
          {courses.length === 0 ? (
            <p className="text-sm text-zinc-500">No courses yet. Create one above.</p>
          ) : (
            courses.map((course) => (
              <div
                key={course.id}
                className="rounded-xl border border-zinc-800 bg-zinc-950 p-5"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <h3 className="font-medium">{course.title}</h3>
                    {course.description && (
                      <p className="mt-1 text-sm text-zinc-400">{course.description}</p>
                    )}
                    <p className="mt-2 text-xs text-zinc-500">
                      {course.enrollmentCount ?? 0} assigned · {course.published ? 'Published' : 'Draft'}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2"><button type="button" onClick={() => void handleShareLink(course.id)} className="inline-flex items-center gap-2 rounded-lg border border-emerald-400/30 px-3 py-2 text-sm text-emerald-100 hover:bg-emerald-400/10"><Link2 className="h-4 w-4" />Copy learner link</button><button type="button" onClick={() => setAssignCourseId(assignCourseId === course.id ? null : course.id)} className="inline-flex items-center gap-2 rounded-lg border border-zinc-700 px-3 py-2 text-sm hover:bg-zinc-900"><Send className="h-4 w-4" />Assign</button></div>
                </div>

                {assignCourseId === course.id && (
                  <div className="mt-4 border-t border-zinc-800 pt-4 space-y-3">
                    <label className="text-sm text-zinc-400">
                      Learner emails (comma or newline separated)
                    </label>
                    <textarea
                      value={assignEmails}
                      onChange={(e) => setAssignEmails(e.target.value)}
                      placeholder="alex@company.com, rosa@company.com"
                      rows={3}
                      className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm"
                    />
                    <button
                      type="button"
                      disabled={assigning}
                      onClick={() => handleAssign(course.id)}
                      className="rounded-lg bg-white px-4 py-2 text-sm font-medium text-black hover:bg-zinc-100 disabled:opacity-50"
                    >
                      {assigning ? 'Assigning…' : 'Send assignments'}
                    </button>
                  </div>
                )}
              </div>
            ))
          )}
        </section>
      </div>
    </div>
  )
}
