'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowUpRight, Award, Brain, Share2 } from 'lucide-react'

type CompetencyItem = {
  id: string
  name: string
  level: string
  progress: number
  evidence?: string
}

const DEMO_COMPETENCIES: CompetencyItem[] = [
  { id: '1', name: 'React & TypeScript', level: 'Proficient', progress: 85, evidence: '3 videos · 12 chat sessions' },
  { id: '2', name: 'AWS Fundamentals', level: 'Foundational', progress: 45, evidence: '1 course in progress' },
  { id: '3', name: 'Data Analysis', level: 'Intermediate', progress: 62, evidence: 'Code extracted from 2 modules' },
]

export default function CompetenciesPage() {
  const [items, setItems] = useState<CompetencyItem[]>(DEMO_COMPETENCIES)
  const [publicSlug] = useState('demo')

  useEffect(() => {
    // TODO: fetch from /api/competencies when Aurora is wired
    setItems(DEMO_COMPETENCIES)
  }, [])

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="mx-auto max-w-4xl px-6 py-12">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold">My competencies</h1>
            <p className="mt-1 text-sm text-zinc-400">
              Skills verified through your learning — share your profile with HR or your manager.
            </p>
          </div>
          <Link
            href={`/p/${publicSlug}`}
            className="inline-flex items-center gap-2 rounded-lg border border-zinc-700 px-4 py-2 text-sm hover:border-zinc-500"
          >
            <Share2 className="h-4 w-4" />
            View public profile
            <ArrowUpRight className="h-3 w-3" />
          </Link>
        </div>

        <div className="mt-8 space-y-4">
          {items.map((item) => (
            <div key={item.id} className="rounded-xl border border-zinc-800 bg-zinc-950/80 p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <Brain className="mt-0.5 h-5 w-5 text-zinc-500" />
                  <div>
                    <h2 className="font-medium">{item.name}</h2>
                    <p className="text-xs text-zinc-500">{item.level}</p>
                    {item.evidence && (
                      <p className="mt-1 text-sm text-zinc-400">{item.evidence}</p>
                    )}
                  </div>
                </div>
                <span className="text-sm font-mono text-zinc-300">{item.progress}%</span>
              </div>
              <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-zinc-800">
                <div
                  className="h-full rounded-full bg-white transition-all"
                  style={{ width: `${item.progress}%` }}
                />
              </div>
            </div>
          ))}
        </div>

        <div className="mt-10 rounded-xl border border-zinc-800 bg-zinc-900/40 p-6">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Award className="h-4 w-4 text-zinc-400" />
            Certificates
          </div>
          <p className="mt-2 text-sm text-zinc-400">
            Complete assigned courses to earn certificates with shareable public links.
          </p>
          <Link href="/workspace" className="mt-4 inline-block text-sm text-blue-400 hover:text-blue-300">
            Continue learning in workspace
          </Link>
        </div>
      </div>
    </div>
  )
}
