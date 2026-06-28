'use client'

import { useMemo, useState } from 'react'

function isPromoActive() {
  // Personal Pro promo is active "now" per requirements
  return true
}

export default function PersonalOnboardingPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const promo = useMemo(() => isPromoActive(), [])

  const startCheckout = async () => {
    setError(null)
    setLoading(true)
    try {
      const res = await fetch('/api/billing/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planId: 'personal-pro',
          email,
          promo,
          returnUrl: `/onboarding/success`
        })
      })
      const data = await res.json()
      if (!res.ok || !data.checkoutUrl) {
        throw new Error(data?.error || 'Could not start checkout')
      }
      window.location.assign(data.checkoutUrl as string)
    } catch (e: any) {
      setError(e?.message || 'Checkout failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="max-w-2xl mx-auto px-6 py-12">
        <h1 className="text-3xl font-bold mb-2">Personal Pro</h1>
        <p className="text-zinc-400 mb-8">For individual creators and learners. {promo && <span className="text-emerald-300">Promo: 20% off if you sign up now</span>}.</p>

        <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6">
          <div className="text-3xl font-bold mb-2">${promo ? 16 : 20}<span className="text-base text-zinc-400">/mo</span></div>
          {promo && <div className="text-amber-300 text-sm mb-4">Promo applied: 20% off (regular $20)</div>}

          <div className="space-y-3 mb-4">
            <div>
              <label className="block text-sm text-zinc-400 mb-1">Email (optional)</label>
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full px-4 py-3 bg-zinc-900 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          <button
            onClick={startCheckout}
            disabled={loading}
            className="px-5 py-3 rounded-lg bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:opacity-50"
          >
            {loading ? 'Starting checkout…' : 'Upgrade to Pro'}
          </button>
        </div>
      </div>
    </div>
  )
}


