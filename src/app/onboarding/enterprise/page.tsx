'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function EnterpriseOnboardingPage() {
  const router = useRouter()
  const [orgName, setOrgName] = useState('')
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleCheckout = async () => {
    setError(null)
    if (!orgName.trim()) {
      setError('Please enter your organization name')
      return
    }
    setLoading(true)
    try {
      const res = await fetch('/api/billing/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planId: 'enterprise-community',
          orgName,
          email,
          returnUrl: `${process.env.NEXT_PUBLIC_APP_URL || ''}/onboarding/success`
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
      <div className="max-w-3xl mx-auto px-6 py-12">
        <h1 className="text-3xl font-bold mb-2">Enterprise External (Promo)</h1>
        <p className="text-zinc-400 mb-8">Early access promo: <span className="text-white font-semibold">$999/mo</span> for up to <span className="text-white font-semibold">500 external learners</span>. Regular price <span className="line-through">$1999/mo</span> — limited time 50% off.</p>

        <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6">
          <div className="grid grid-cols-1 gap-4">
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

          {error && (
            <div className="mt-4 text-sm text-red-300">{error}</div>
          )}

          <div className="mt-6 flex items-center gap-3">
            <button
              onClick={handleCheckout}
              disabled={loading}
              className="px-5 py-3 rounded-lg bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:opacity-50"
            >
              {loading ? 'Starting checkout…' : 'Start checkout ($999/mo)'}
            </button>
            <span className="text-xs text-zinc-400">Includes 500 external users/month. Upgrade later as needed.</span>
          </div>
        </div>
      </div>
    </div>
  )
}


