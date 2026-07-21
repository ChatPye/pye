'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  ArrowLeft,
  BookOpen,
  CheckCircle2,
  Loader2,
  TrendingUp,
  Users,
} from 'lucide-react'

type DashboardData = {
  stats: {
    totalCourses: number
    publishedCourses: number
    activeEnrollments: number
    completedEnrollments: number
    avgProgress: number
  }
  teamProgress: Array<{
    assigneeName?: string
    assigneeEmail?: string
    coursesAssigned: number
    coursesCompleted: number
    avgProgress: number
  }>
  recentActivity: Array<{
    id: string
    type: string
    ownerClerkId?: string
    createdAt: string
    payload?: Record<string, unknown>
  }>
  enrollments: Array<{
    id: string
    courseTitle: string
    assigneeName?: string
    assigneeEmail?: string
    status: string
    progressPercent: number
  }>
}

export default function HrDashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    ;(async () => {
      try {
        const res = await fetch('/api/hr/dashboard')
        if (!res.ok) {
          const body = await res.json().catch(() => ({}))
          setError(body.error || 'HR access required')
          return
        }
        const json = await res.json()
        setData(json)
      } catch {
        setError('Failed to load dashboard')
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

  if (error || !data) {
    return (
      <div className="min-h-screen bg-black text-white px-6 py-16">
        <div className="mx-auto max-w-lg text-center">
          <h1 className="text-xl font-semibold">L&amp;D Dashboard</h1>
          <p className="mt-2 text-zinc-400">{error || 'Unable to load dashboard'}</p>
          <Link href="/dashboard" className="mt-6 inline-block text-blue-400 hover:text-blue-300">
            Back to dashboard
          </Link>
        </div>
      </div>
    )
  }

  const { stats, teamProgress, recentActivity, enrollments } = data
  const reviewSignals = recentActivity.filter((event) => event.type.startsWith('skillproof.'))

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="mx-auto max-w-6xl px-6 py-10">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-300"
            >
              <ArrowLeft className="h-4 w-4" />
              Dashboard
            </Link>
            <h1 className="mt-2 text-2xl font-semibold">L&amp;D / HR Dashboard</h1>
            <p className="text-sm text-zinc-400">Team learning progress and course assignments</p>
          </div>
          <Link
            href="/dashboard/courses"
            className="inline-flex items-center justify-center rounded-lg bg-white px-4 py-2 text-sm font-medium text-black hover:bg-zinc-100"
          >
            Manage courses
          </Link>
        </div>

        <div className="mt-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
          {[
            { label: 'Courses', value: stats.totalCourses, icon: BookOpen },
            { label: 'Active enrollments', value: stats.activeEnrollments, icon: Users },
            { label: 'Completed', value: stats.completedEnrollments, icon: CheckCircle2 },
            { label: 'Avg progress', value: `${stats.avgProgress}%`, icon: TrendingUp },
          ].map(({ label, value, icon: Icon }) => (
            <div key={label} className="rounded-xl border border-zinc-800 bg-zinc-950 p-4">
              <div className="flex items-center gap-2 text-zinc-500">
                <Icon className="h-4 w-4" />
                <span className="text-xs">{label}</span>
              </div>
              <p className="mt-2 text-2xl font-semibold">{value}</p>
            </div>
          ))}
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-2">
          <section className="rounded-xl border border-zinc-800 bg-zinc-950 p-5">
            <h2 className="font-medium">Team progress</h2>
            {teamProgress.length === 0 ? (
              <p className="mt-4 text-sm text-zinc-500">No assignments yet. Assign a course to get started.</p>
            ) : (
              <ul className="mt-4 space-y-3">
                {teamProgress.map((member, i) => (
                  <li key={i} className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-3">
                    <div className="flex justify-between text-sm">
                      <span>{member.assigneeName || member.assigneeEmail || 'Learner'}</span>
                      <span className="text-zinc-400">{member.avgProgress}%</span>
                    </div>
                    <div className="mt-2 h-1.5 rounded-full bg-zinc-800">
                      <div
                        className="h-full rounded-full bg-white"
                        style={{ width: `${member.avgProgress}%` }}
                      />
                    </div>
                    <p className="mt-1 text-xs text-zinc-500">
                      {member.coursesCompleted}/{member.coursesAssigned} courses completed
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="rounded-xl border border-zinc-800 bg-zinc-950 p-5">
            <h2 className="font-medium">Recent activity</h2>
            {recentActivity.length === 0 ? (
              <p className="mt-4 text-sm text-zinc-500">Activity appears when learners upload videos or chat.</p>
            ) : (
              <ul className="mt-4 space-y-2">
                {recentActivity.slice(0, 8).map((ev) => (
                  <li key={ev.id} className="flex justify-between text-sm border-b border-zinc-800/80 pb-2">
                    <span className="text-zinc-300">{ev.type.replace(/\./g, ' · ')}</span>
                    <span className="text-zinc-500 text-xs">
                      {new Date(ev.createdAt).toLocaleDateString()}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        <section className="mt-8 rounded-xl border border-zinc-800 bg-zinc-950 p-5">
          <h2 className="font-medium">Recent assignments</h2>
          {enrollments.length === 0 ? (
            <p className="mt-4 text-sm text-zinc-500">No course assignments yet.</p>
          ) : (
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-zinc-500 border-b border-zinc-800">
                    <th className="pb-2 pr-4">Course</th>
                    <th className="pb-2 pr-4">Learner</th>
                    <th className="pb-2 pr-4">Status</th>
                    <th className="pb-2">Progress</th>
                  </tr>
                </thead>
                <tbody>
                  {enrollments.slice(0, 10).map((e) => (
                    <tr key={e.id} className="border-b border-zinc-800/60">
                      <td className="py-3 pr-4">{e.courseTitle}</td>
                      <td className="py-3 pr-4 text-zinc-400">
                        {e.assigneeName || e.assigneeEmail || '—'}
                      </td>
                      <td className="py-3 pr-4 capitalize">{e.status.replace('_', ' ')}</td>
                      <td className="py-3">{e.progressPercent}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="mt-8 rounded-xl border border-emerald-400/20 bg-emerald-400/[0.035] p-5">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-300">SkillProof review queue</p>
              <h2 className="mt-1 font-medium">Evidence awaiting manager judgement</h2>
              <p className="mt-1 text-sm text-zinc-400">Task signals help you review work. They are not an automatic hiring or performance decision.</p>
            </div>
            <span className="w-fit rounded-full border border-emerald-300/20 bg-emerald-300/10 px-2.5 py-1 text-xs text-emerald-100">{reviewSignals.length} signals</span>
          </div>
          {reviewSignals.length === 0 ? (
            <p className="mt-4 text-sm text-zinc-500">Evidence will appear here when assigned learners complete task steps, save a snip or submit a reflection.</p>
          ) : (
            <ul className="mt-4 space-y-3">
              {reviewSignals.slice(0, 10).map((signal) => {
                const evidenceUrl = typeof signal.payload?.evidenceUrl === 'string' ? signal.payload.evidenceUrl : ''
                const reflection = typeof signal.payload?.reflection === 'string' ? signal.payload.reflection : ''
                const workspace = typeof signal.payload?.workspace === 'string' ? signal.payload.workspace : 'learning workspace'
                return (
                  <li key={signal.id} className="rounded-xl border border-white/10 bg-black/20 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-sm font-medium text-white">{signal.type.replace('skillproof.', '').replaceAll('_', ' ')}</p>
                      <span className="text-xs text-zinc-500">{workspace} · {new Date(signal.createdAt).toLocaleString()}</span>
                    </div>
                    {reflection && <p className="mt-2 text-sm leading-6 text-zinc-300">{reflection}</p>}
                    {evidenceUrl && <a className="mt-2 inline-block text-sm text-emerald-300 underline underline-offset-4 hover:text-emerald-200" href={evidenceUrl} target="_blank" rel="noreferrer">Open submitted evidence</a>}
                    <p className="mt-3 text-xs text-zinc-500">Reviewer status: system evidence — a manager must review before verification.</p>
                  </li>
                )
              })}
            </ul>
          )}
        </section>
      </div>
    </div>
  )
}
