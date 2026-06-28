"use client"
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowUpRight, Users, FolderPlus, LayoutDashboard, Settings, SlidersHorizontal, Zap } from 'lucide-react'

export default function ProfilePage() {
  const [userName, setUserName] = useState<string>('Workspace member')
  const [planKey, setPlanKey] = useState<string>('freemium')
  const [tenantId, setTenantId] = useState<string>('')
  const [inviteUsed, setInviteUsed] = useState<number>(0)
  const [inviteLimit, setInviteLimit] = useState<number>(2)
  const [loadingUpgrade, setLoadingUpgrade] = useState<boolean>(false)

  useEffect(() => {
    const currentUserName = typeof window !== 'undefined' ? (window as any).CHATPYE_USER_NAME || 'Job Oyebisi' : 'Workspace member'
    setUserName(currentUserName)
    ;(async () => {
      try {
        const res = await fetch('/api/user/plan')
        if (!res.ok) return
        const data = await res.json()
        setPlanKey(data.plan ?? 'freemium')
        setTenantId(data.tenantId ?? '')
        setInviteLimit(Number(data.inviteLimit ?? 2))
        setInviteUsed(Number(data.inviteUsed ?? 0))
      } catch (error) {
        console.error('Failed to load plan info', error)
      }
    })()
  }, [])

  const handleUpgrade = async () => {
    try {
      setLoadingUpgrade(true)
      const res = await fetch('/api/billing/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          planId: 'personal-pro', 
          quantity: 1, 
          returnUrl: `${typeof window !== 'undefined' ? window.location.origin : ''}/onboarding/success?plan=pro`
        }),
      })
      const data = await res.json()
      if (data?.checkoutUrl) {
        window.location.href = data.checkoutUrl
      } else if (data?.error) {
        alert(data.error)
      }
    } catch (error) {
      console.error('Upgrade error:', error)
      alert('Failed to start checkout. Please try again.')
    } finally {
      setLoadingUpgrade(false)
    }
  }

  return (
    <div className="mx-auto w-full max-w-[1000px] px-4 py-6 sm:px-6">
      {/* Sticky profile bar */}
      <div className="sticky top-16 z-10 mb-6 rounded-xl border border-white/10 bg-zinc-900/70 backdrop-blur p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-xs uppercase tracking-widest text-white/40">Profile</div>
            <div className="text-lg font-semibold text-white">{userName}</div>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/dashboard/referrals"
              className="inline-flex items-center gap-2 rounded-xl border border-emerald-400/40 bg-emerald-400/15 px-3 py-2 text-sm font-semibold text-emerald-100 transition hover:border-emerald-300 hover:text-white"
            >
              <Users className="h-4 w-4" />
              Invite friend
            </Link>
            {planKey !== 'pro' && (
              <button
                type="button"
                onClick={handleUpgrade}
                className="inline-flex items-center gap-2 rounded-xl border border-blue-400/40 bg-blue-400/15 px-3 py-2 text-sm font-semibold text-blue-100 transition hover:border-blue-300 hover:text-white"
              >
                <ArrowUpRight className="h-4 w-4" />
                {loadingUpgrade ? 'Starting checkout…' : 'Upgrade to Pro'}
              </button>
            )}
          </div>
        </div>
        {/* Plan banner inside profile bar */}
        <div className="mt-3 text-sm text-zinc-300">
          {planKey === 'freemium' ? (
            <span>
              Freemium • Invites {inviteUsed}/{inviteLimit} • <button onClick={handleUpgrade} className="underline hover:text-white">Upgrade for more</button>
            </span>
          ) : (
            <span className="text-zinc-400">Current plan: {planKey}</span>
          )}
        </div>
      </div>

      {/* Quick links */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Link href="/pods" className="group rounded-xl border border-white/10 bg-black/60 p-4 hover:border-white/20">
          <div className="mb-2 flex items-center gap-2 text-white">
            <LayoutDashboard className="h-4 w-4" />
            <span className="font-semibold">Pods dashboard</span>
          </div>
          <p className="text-sm text-zinc-400">Manage and browse your pods.</p>
        </Link>
        <Link href="/pods/new" className="group rounded-xl border border-white/10 bg-black/60 p-4 hover:border-white/20">
          <div className="mb-2 flex items-center gap-2 text-white">
            <FolderPlus className="h-4 w-4" />
            <span className="font-semibold">Create pod</span>
          </div>
          <p className="text-sm text-zinc-400">Create a new learning pathway pod.</p>
        </Link>
        <Link href="/workspace/settings" className="group rounded-xl border border-white/10 bg-black/60 p-4 hover:border-white/20">
          <div className="mb-2 flex items-center gap-2 text-white">
            <Settings className="h-4 w-4" />
            <span className="font-semibold">Settings</span>
          </div>
          <p className="text-sm text-zinc-400">General account and app settings.</p>
        </Link>
        <Link href="/workspace/personalisation" className="group rounded-xl border border-white/10 bg-black/60 p-4 hover:border-white/20">
          <div className="mb-2 flex items-center gap-2 text-white">
            <SlidersHorizontal className="h-4 w-4" />
            <span className="font-semibold">Personalisation</span>
          </div>
          <p className="text-sm text-zinc-400">Themes and preferences (coming soon).</p>
        </Link>
        <Link href="/extension" className="group rounded-xl border border-white/10 bg-black/60 p-4 hover:border-white/20">
          <div className="mb-2 flex items-center gap-2 text-white">
            <Zap className="h-4 w-4" />
            <span className="font-semibold">Extension</span>
          </div>
          <p className="text-sm text-zinc-400">Open the extension dashboard.</p>
        </Link>
      </div>
    </div>
  )
}


