import Link from 'next/link'
import { ArrowRight, Award, Brain, Share2, ShieldCheck } from 'lucide-react'
import Background from '@/components/Background'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import type { PublicProfile } from '@/app/api/profiles/[slug]/route'

export const dynamic = 'force-dynamic'

async function getProfile(slug: string): Promise<PublicProfile | null> {
  const base = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  try {
    const res = await fetch(`${base}/api/profiles/${slug}`, { cache: 'no-store' })
    if (!res.ok) return null
    return res.json()
  } catch {
    return null
  }
}

export default async function PublicProfilePage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const profile = await getProfile(slug)

  if (!profile) {
    return (
      <div className="relative min-h-screen bg-black text-white">
        <Background />
        <Header />
        <main className="mx-auto max-w-2xl px-6 py-32 text-center">
          <h1 className="text-2xl font-semibold">Profile not found</h1>
          <p className="mt-2 text-zinc-400">This competency profile does not exist or is private.</p>
          <Link href="/" className="mt-6 inline-block text-blue-400 hover:text-blue-300">
            Back to home
          </Link>
        </main>
        <Footer />
      </div>
    )
  }

  return (
    <div className="relative min-h-screen bg-black text-white">
      <Background />
      <Header />
      <main className="mx-auto max-w-4xl px-6 py-16 lg:px-8">
        <div className="rounded-2xl border border-zinc-800 bg-zinc-950/80 p-8">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-xs uppercase tracking-wider text-zinc-500">Verified competency profile</p>
              <h1 className="mt-2 text-3xl font-semibold">{profile.name}</h1>
              <p className="mt-1 text-zinc-400">{profile.title}</p>
              <p className="mt-3 text-sm text-zinc-300">{profile.headline}</p>
            </div>
            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-300"
              aria-label="Share profile"
            >
              <Share2 className="h-4 w-4" />
              Share
            </button>
          </div>

          <div className="mt-8 grid grid-cols-3 gap-4 border-y border-zinc-800 py-6">
            <div className="text-center">
              <div className="text-2xl font-semibold">{profile.stats.coursesCompleted}</div>
              <div className="text-xs text-zinc-500">Courses</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-semibold">{profile.stats.hoursLearned}h</div>
              <div className="text-xs text-zinc-500">Learning</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-semibold">{profile.stats.chatSessions}</div>
              <div className="text-xs text-zinc-500">AI sessions</div>
            </div>
          </div>

          <section className="mt-8">
            <h2 className="flex items-center gap-2 text-lg font-medium">
              <Brain className="h-5 w-5 text-zinc-400" />
              Competencies
            </h2>
            <ul className="mt-4 space-y-3">
              {profile.competencies.map((c) => (
                <li key={c.name} className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-4">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{c.name}</span>
                    <span className="text-xs text-zinc-500">{c.level}</span>
                  </div>
                  <p className="mt-1 text-sm text-zinc-400">{c.evidence}</p>
                </li>
              ))}
            </ul>
          </section>

          {profile.certificates.length > 0 && (
            <section className="mt-8">
              <h2 className="flex items-center gap-2 text-lg font-medium">
                <Award className="h-5 w-5 text-zinc-400" />
                Certificates
              </h2>
              <ul className="mt-4 space-y-2">
                {profile.certificates.map((c) => (
                  <li key={c.title} className="flex justify-between text-sm">
                    <span>{c.title}</span>
                    <span className="text-zinc-500">{c.issuedAt}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <div className="mt-10 rounded-xl border border-zinc-700 bg-zinc-900/60 p-6">
            <div className="flex items-start gap-3">
              <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-green-400" />
              <div>
                <h3 className="font-medium">Is this your employee or team member?</h3>
                <p className="mt-1 text-sm text-zinc-400">
                  ChatPye helps HR and L&amp;D leaders assign training, track verified skills, and onboard teams.
                  Bring your company onboard to assign courses and view team competency dashboards.
                </p>
                <Link
                  href="/enterprise"
                  className="mt-4 inline-flex items-center gap-2 rounded-md bg-white px-4 py-2 text-sm font-medium text-black hover:bg-zinc-100"
                >
                  Get your team on ChatPye
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  )
}
