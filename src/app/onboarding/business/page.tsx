'use client'

import { useMemo, useState } from 'react'

function isPromoActive() {
  const now = new Date()
  const cutoff = new Date(`${new Date().getFullYear()}-12-01T00:00:00Z`)
  return now < cutoff
}

export default function BusinessOnboardingPage() {
  const [orgName, setOrgName] = useState('')
  const [email, setEmail] = useState('')
  const [seats, setSeats] = useState(5)
  const [loading, setLoading] = useState<'starter' | 'team' | null>(null)
  const [error, setError] = useState<string | null>(null)
  const promo = useMemo(() => isPromoActive(), [])

  const startCheckout = async (planId: 'business-starter' | 'business-team') => {
    setError(null)
    if (!orgName.trim()) {
      setError('Please enter your organization name')
      return
    }
    setLoading(planId.includes('team') ? 'team' : 'starter')
    try {
      const res = await fetch('/api/billing/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planId,
          orgName,
          email,
          quantity: planId === 'business-team' ? Math.max(1, Math.floor(seats)) : undefined,
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
      setLoading(null)
    }
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="max-w-4xl mx-auto px-6 py-12">
        <h1 className="text-3xl font-bold mb-2">Business Plans</h1>
        <p className="text-zinc-400 mb-8">Starter and Team options for L&D and content teams. {promo && <span className="text-emerald-300">Promo: 20% off until Dec 1</span>}.</p>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Starter */}
          <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6">
            <h2 className="text-xl font-semibold mb-1">Starter</h2>
            <p className="text-zinc-400 mb-4">For small teams getting started.</p>
            <div className="text-3xl font-bold mb-2">${promo ? 16 : 20}<span className="text-base text-zinc-400">/seat/mo</span></div>
            {promo && <div className="text-amber-300 text-sm mb-4">Promo applied: 20% off (regular $20)</div>}

            <div className="space-y-3 mb-4">
              <div>
                <label className="block text-sm text-zinc-400 mb-1">Organization name</label>
                <input
                  value={orgName}
                  onChange={(e) => setOrgName(e.target.value)}
                  placeholder="Acme Inc"
                  className="w-full px-4 py-3 bg-zinc-900 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm text-zinc-400 mb-1">Billing email (optional)</label>
                <input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="billing@acme.com"
                  className="w-full px-4 py-3 bg-zinc-900 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
            <button
              onClick={() => startCheckout('business-starter')}
              disabled={loading !== null}
              className="px-5 py-3 rounded-lg bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:opacity-50"
            >
              {loading === 'starter' ? 'Starting…' : 'Choose Starter'}
            </button>
          </div>

          {/* Team */}
          <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6">
            <h2 className="text-xl font-semibold mb-1">Team</h2>
            <p className="text-zinc-400 mb-4">Ideal for L&D teams. Unlimited invites within seats.</p>
            <div className="text-3xl font-bold mb-2">${promo ? 16 : 20}<span className="text-base text-zinc-400">/seat/mo</span></div>
            {promo && <div className="text-amber-300 text-sm mb-4">Promo applied: 20% off (regular $20)</div>}

            <div className="space-y-3 mb-4">
              <div>
                <label className="block text-sm text-zinc-400 mb-1">Organization name</label>
                <input
                  value={orgName}
                  onChange={(e) => setOrgName(e.target.value)}
                  placeholder="Acme Inc"
                  className="w-full px-4 py-3 bg-zinc-900 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm text-zinc-400 mb-1">Billing email (optional)</label>
                <input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="billing@acme.com"
                  className="w-full px-4 py-3 bg-zinc-900 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm text-zinc-400 mb-1">Seats</label>
                <input
                  type="number"
                  min={1}
                  value={seats}
                  onChange={(e) => setSeats(Number(e.target.value))}
                  className="w-32 px-4 py-3 bg-zinc-900 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            <button
              onClick={() => startCheckout('business-team')}
              disabled={loading !== null}
              className="px-5 py-3 rounded-lg bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:opacity-50"
            >
              {loading === 'team' ? 'Starting…' : 'Choose Team'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}


