'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { Atom, BrainCircuit, Sparkles } from 'lucide-react'
import type { ReactNode } from 'react'

export const dynamic = 'force-dynamic'

export default function PyeLabPage() {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [feedback, setFeedback] = useState('')

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()

    if (!email.trim()) return

    setStatus('loading')
    setFeedback('')

    try {
      const response = await fetch('/api/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })

      const payload = await response.json()
      
      if (response.ok) {
        setStatus('success')
        setFeedback(payload.message || 'You’re all set! Pye Lab updates will land in your inbox soon.')
        setEmail('')
      } else {
        setStatus('error')
        setFeedback(payload.error || 'We could not capture your email. Please try again shortly.')
      }
    } catch (error) {
      console.error('Pye Lab subscribe error', error)
      setStatus('error')
      setFeedback('Something went wrong. Please check your connection and retry.')
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-[#020617] to-black text-white">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -left-40 top-10 h-96 w-96 rounded-full bg-blue-500/10 blur-3xl" />
        <div className="absolute bottom-0 right-0 h-[420px] w-[420px] rounded-full bg-purple-500/10 blur-[140px]" />
            </div>

      <div className="relative mx-auto flex min-h-screen w-full max-w-4xl flex-col px-6 py-10 lg:px-8">
        <header className="flex items-center justify-between border-b border-white/5 pb-6">
          <Link href="/" className="inline-flex items-center gap-2 text-sm font-medium text-white/80 transition hover:text-white">
            <span className="inline-flex h-9 w-9 items-center justify-center overflow-hidden rounded-full border border-white/10 bg-white/10">
              <Image src="/favicon.ico" alt="ChatPye" width={32} height={32} className="h-6 w-6" />
            </span>
            <span>ChatPye</span>
          </Link>
          <nav className="hidden items-center gap-6 text-xs text-white/50 md:flex">
            <Link href="/#features" className="transition hover:text-white">
              Features
            </Link>
            <Link href="/#pricing" className="transition hover:text-white">
              Pricing
            </Link>
            <Link href="/about" className="transition hover:text-white">
              About
            </Link>
            <Link href="/start" className="inline-flex items-center gap-1 rounded-full border border-white/10 px-3 py-1.5 text-white/70 transition hover:border-white/20 hover:text-white">
              Sign in
              </Link>
      </nav>
        </header>

        <main className="flex flex-1 flex-col justify-center py-16">
          <section className="text-center space-y-6">
            <p className="text-xs uppercase tracking-[0.35em] text-white/40">ChatPye Research</p>
            <h1 className="text-4xl font-light tracking-tight text-white sm:text-5xl">
              Pye Lab — our AI research engine
          </h1>
            <p className="text-base text-white/60 sm:text-lg max-w-2xl mx-auto">
              Join the private list for multimodal AI experiments, early prototypes, and research deep dives in learning science.
            </p>
          </section>

          <form onSubmit={handleSubmit} className="mx-auto mt-10 w-full max-w-md">
            <div className="rounded-2xl border border-white/10 bg-black/40 p-1.5 shadow-[0_10px_40px_rgba(8,47,168,0.15)]">
              <div className="flex items-center gap-2 rounded-xl border border-white/5 bg-black/60 px-4 py-2">
              <input 
                type="email" 
                value={email}
                  onChange={(event) => setEmail(event.target.value)}
                required 
                  placeholder="your@email.com"
                  className="flex-1 bg-transparent text-sm text-white placeholder-white/40 focus:outline-none"
              />
              <button 
                type="submit" 
                  disabled={status === 'loading'}
                  className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2 text-xs font-semibold text-black transition hover:bg-white/80 disabled:cursor-not-allowed disabled:opacity-70"
              >
                  {status === 'loading' ? 'Joining…' : 'Join the list'}
              </button>
            </div>
          </div>
            {feedback && (
              <p
                className={`mt-4 text-sm ${status === 'success' ? 'text-emerald-300' : 'text-rose-300'}`}
              >
                {feedback}
              </p>
            )}
          </form>
          
          <section className="mt-16 grid gap-6 rounded-3xl border border-white/5 bg-white/[0.03] p-8 backdrop-blur">
            <div className="grid gap-6 md:grid-cols-3">
              <ResearchCard
                title="Multimodal cognition"
                icon={<BrainCircuit className="h-5 w-5" />}
                description="Prototype MCP-powered tutors that reason over video, slides, code, and lab data with explainable chains."
              />
              <ResearchCard
                title="Foundational skills"
                icon={<Atom className="h-5 w-5" />}
                description="Reimagine literacy & numeracy instruction through adaptive sequences and evidence-based pedagogy."
              />
              <ResearchCard
                title="Competency proof"
                icon={<Sparkles className="h-5 w-5" />}
                description="Design verifiable competency signals for teams, schools, and governments to trust AI-assisted learning."
              />
            </div>
            <p className="text-center text-sm text-white/40">
              Pye Lab discoveries power upcoming workspace releases and extension upgrades.
            </p>
          </section>
        </main>

        <footer className="border-t border-white/5 py-6 text-xs text-white/40">
          <div className="flex flex-col items-center justify-between gap-3 sm:flex-row">
            <span>© {new Date().getFullYear()} ChatPye. All rights reserved.</span>
            <div className="flex items-center gap-4">
              <Link className="transition hover:text-white" href="/privacy">
                Privacy
              </Link>
              <Link className="transition hover:text-white" href="/terms">
                Terms
              </Link>
              <Link className="transition hover:text-white" href="/support">
                Support
            </Link>
          </div>
        </div>
        </footer>
            </div>
          </div>
  )
}

function ResearchCard({ title, description, icon }: { title: string; description: string; icon: ReactNode }) {
  return (
    <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-6 transition hover:border-white/20 hover:bg-white/[0.05]">
      <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500/30 to-purple-500/40 text-white">
        {icon}
        </div>
      <h3 className="text-sm font-semibold text-white">{title}</h3>
      <p className="mt-3 text-xs text-white/60 leading-relaxed">{description}</p>
    </div>
  )
}