'use client';

import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-zinc-950 text-white">
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
              <Link href="/about" className="text-zinc-300 hover:text-white transition">About</Link>
              <Link href="/start" className="text-zinc-300 hover:text-white transition">Sign in</Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="mx-auto max-w-4xl px-6 py-16 lg:px-8">
        <div className="text-center mb-16">
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight mb-6">
            Terms of Service
          </h1>
          <p className="text-xl text-zinc-400 max-w-2xl mx-auto">
            Last updated: {new Date().toLocaleDateString()}
          </p>
        </div>

        <div className="prose prose-invert max-w-none">
          <div className="bg-zinc-900/50 rounded-xl p-8 border border-zinc-800 mb-8">
            <h2 className="text-2xl font-semibold mb-4">1. Acceptance of Terms</h2>
            <p className="text-zinc-300 leading-relaxed">
              By accessing and using ChatPye's services, you accept and agree to be bound by the terms and provision of this agreement. 
              If you do not agree to abide by the above, please do not use this service.
            </p>
          </div>

          <div className="bg-zinc-900/50 rounded-xl p-8 border border-zinc-800 mb-8">
            <h2 className="text-2xl font-semibold mb-4">2. Use License</h2>
            <p className="text-zinc-300 leading-relaxed mb-4">
              Permission is granted to temporarily use ChatPye for personal, non-commercial transitory viewing only. This is the grant of a license, not a transfer of title, and under this license you may not:
            </p>
            <ul className="list-disc list-inside text-zinc-300 space-y-2 ml-4">
              <li>modify or copy the materials</li>
              <li>use the materials for any commercial purpose or for any public display</li>
              <li>attempt to reverse engineer any software contained on the website</li>
              <li>remove any copyright or other proprietary notations from the materials</li>
            </ul>
          </div>

          <div className="bg-zinc-900/50 rounded-xl p-8 border border-zinc-800 mb-8">
            <h2 className="text-2xl font-semibold mb-4">3. User Accounts</h2>
            <p className="text-zinc-300 leading-relaxed">
              When you create an account with us, you must provide information that is accurate, complete, and current at all times. 
              You are responsible for safeguarding the password and for all activities that occur under your account.
            </p>
          </div>

          <div className="bg-zinc-900/50 rounded-xl p-8 border border-zinc-800 mb-8">
            <h2 className="text-2xl font-semibold mb-4">4. Privacy Policy</h2>
            <p className="text-zinc-300 leading-relaxed">
              Your privacy is important to us. Please review our Privacy Policy, which also governs your use of the Service, to understand our practices.
            </p>
          </div>

          <div className="bg-zinc-900/50 rounded-xl p-8 border border-zinc-800 mb-8">
            <h2 className="text-2xl font-semibold mb-4">5. Limitation of Liability</h2>
            <p className="text-zinc-300 leading-relaxed">
              In no event shall ChatPye, nor its directors, employees, partners, agents, suppliers, or affiliates, be liable for any indirect, 
              incidental, special, consequential, or punitive damages, including without limitation, loss of profits, data, use, goodwill, 
              or other intangible losses, resulting from your use of the service.
            </p>
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
              <Link href="/terms" className="text-white font-medium">Terms</Link>
              <Link href="/pyelab" className="hover:text-white transition">Pye Lab</Link>
              <Link href="/about" className="hover:text-white transition">About</Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}