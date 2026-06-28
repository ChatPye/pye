'use client';

import Link from 'next/link';

// Force dynamic rendering to avoid SSR issues
export const dynamic = 'force-dynamic';

export default function AboutPage() {
  return (
    <div className="min-h-full bg-zinc-950 text-white">
      {/* Navigation */}
      <nav className="border-b border-zinc-800 bg-zinc-950/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center">
              <Link href="/" className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 text-white">
                    <path d="M11.017 2.814a1 1 0 0 1 1.966 0l1.051 5.558a2 2 0 0 0 1.594 1.594l5.558 1.051a1 1 0 0 1 0 1.966l-5.558 1.051a2 2 0 0 0-1.594 1.594l-1.051 5.558a1 1 0 0 1-1.966 0l-1.051-5.558a2 2 0 0 0-1.594-1.594l-5.558-1.051a1 1 0 0 1 0-1.966l5.558-1.051a2 2 0 0 0 1.594-1.594z"></path>
                    <path d="M20 2v4"></path>
                    <path d="M22 4h-4"></path>
                    <circle cx="4" cy="20" r="2"></circle>
                  </svg>
                </div>
                <span className="text-xl font-bold">ChatPye</span>
              </Link>
            </div>
            <div className="hidden md:flex items-center space-x-8">
              <Link href="/#features" className="text-zinc-300 hover:text-white transition">Features</Link>
              <Link href="/#pricing" className="text-zinc-300 hover:text-white transition">Pricing</Link>
              <Link href="/pyelab" className="text-zinc-300 hover:text-white transition">Pye Lab</Link>
              <Link href="/about" className="text-white font-medium">About</Link>
              <Link href="/start" className="text-zinc-300 hover:text-white transition">Sign in</Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="mx-auto max-w-4xl px-6 py-16 lg:px-8">
        <div className="text-center mb-16">
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight mb-6">
            About ChatPye
          </h1>
          <p className="text-xl text-zinc-400 max-w-3xl mx-auto">
            We're on a mission to redefine video-based upskilling for the future of work. ChatPye transforms every training or tutorial video into an AI-powered, interactive tutor—so learners no longer just watch, but engage, master, and prove their skills in real time.
          </p>
        </div>

        {/* Mission Section */}
        <div className="mb-16">
          <h2 className="text-3xl font-semibold mb-8 text-center">Our Mission</h2>
          <div className="grid md:grid-cols-2 gap-8">
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-8">
              <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6 text-white">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                </svg>
              </div>
              <h3 className="text-xl font-semibold mb-3">Interactive Learning</h3>
              <p className="text-zinc-400">
                We believe the future of work belongs to those who can learn fast, adapt fast, and prove what they know. ChatPye turns passive video watching into active upskilling experiences where learners ask questions, get instant answers, generate flashcards, and practise with AI-driven simulations—all inside the video itself.
              </p>
            </div>
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-8">
              <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6 text-white">
                  <path d="M9 12l2 2 4-4"></path>
                  <path d="M21 12c.552 0 1-.448 1-1V8a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v3c0 .552.448 1 1 1s1-.448 1-1V8h16v3c0 .552.448 1 1 1z"></path>
                </svg>
              </div>
              <h3 className="text-xl font-semibold mb-3">Proven Results</h3>
              <p className="text-zinc-400">
                Video-based upskilling must go beyond course completion to measurable outcomes. Our AI tutors help learners retain knowledge longer, complete training faster, and demonstrate job-ready skills through personalised learning paths, real-time feedback, and open-source competency profiles. This bridges the gap between training and career opportunities in a fast-changing world of work.
              </p>
            </div>
          </div>
        </div>

        {/* Story Section */}
        <div className="mb-16">
          <h2 className="text-3xl font-semibold mb-8 text-center">Our Story</h2>
          <div className="prose prose-invert max-w-none">
            <div className="bg-gradient-to-r from-blue-500/10 to-purple-600/10 rounded-xl p-8 mb-8 border border-blue-500/20">
              <p className="text-xl text-white font-medium mb-4 text-center">
                "There are two great equalisers in life—Education and AI."
              </p>
              <p className="text-sm text-zinc-400 text-center">
                (Adapted from John Chambers' quote: "There are two great equalisers in life—Education and the Internet.")
              </p>
            </div>
            
            <p className="text-lg text-zinc-300 leading-relaxed mb-6">
              Our story began with our founder; a self-learner on YouTube, eager to upskill but unable to get answers when tutorials left gaps. That moment of frustration lit a spark: what if every learner could talk back to the video, and every video could respond?
            </p>
            
            <p className="text-lg text-zinc-300 leading-relaxed mb-6">
              Today, ChatPye exists to make that vision real. We empower self-learners, professionals, and lifelong students to transform static videos into AI-native learning journeys—building not just knowledge, but evidence of competency that opens doors to new opportunities.
            </p>
            
            <p className="text-lg text-zinc-300 leading-relaxed">
              As the future of work accelerates, one thing is clear: learners deserve more than content—they deserve tools that make video-based upskilling interactive, measurable, and career-defining.
            </p>
          </div>
        </div>

        {/* CTA Section */}
        <div className="rounded-2xl border border-zinc-800 bg-gradient-to-br from-blue-500/10 to-purple-600/10 p-12 text-center">
          <h2 className="text-2xl font-semibold mb-4">Ready to transform your learning?</h2>
          <p className="text-zinc-400 mb-8 max-w-lg mx-auto">
            Join thousands of learners, training providers, and organisations already using ChatPye to make video learning smarter, more engaging, and future-proof.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/#demo-request" className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-6 py-3 text-sm font-medium text-white hover:bg-blue-700 transition">
              Request Demo
            </Link>
            <Link href="https://chrome.google.com/webstore" className="inline-flex items-center justify-center rounded-lg border border-zinc-700 px-6 py-3 text-sm font-medium text-white hover:bg-zinc-800 transition">
              Install Extension
            </Link>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-16 pt-8 border-t border-zinc-800">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center gap-2 mb-4 md:mb-0">
              <div className="h-6 w-6 rounded bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3 h-3 text-white">
                  <path d="M11.017 2.814a1 1 0 0 1 1.966 0l1.051 5.558a2 2 0 0 0 1.594 1.594l5.558 1.051a1 1 0 0 1 0 1.966l-5.558 1.051a2 2 0 0 0-1.594 1.594l-1.051 5.558a1 1 0 0 1-1.966 0l-1.051-5.558a2 2 0 0 0-1.594-1.594l-5.558-1.051a1 1 0 0 1 0-1.966l5.558-1.051a2 2 0 0 0 1.594-1.594z"></path>
                  <path d="M20 2v4"></path>
                  <path d="M22 4h-4"></path>
                  <circle cx="4" cy="20" r="2"></circle>
                </svg>
              </div>
              <span className="font-semibold">ChatPye</span>
            </div>
            <div className="flex items-center space-x-6 text-sm text-zinc-400">
              <Link href="/privacy" className="hover:text-white transition">Privacy</Link>
              <Link href="/terms" className="hover:text-white transition">Terms</Link>
              <Link href="/pyelab" className="hover:text-white transition">Pye Lab</Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
