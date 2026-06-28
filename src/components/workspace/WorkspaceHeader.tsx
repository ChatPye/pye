import Image from 'next/image'
import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { Bell, Menu, Users, User as UserIcon, Plus, LayoutDashboard, LogOut, Settings, HelpCircle, SlidersHorizontal, Zap, ArrowUpRight } from 'lucide-react'

interface WorkspaceHeaderProps {
  sidebarCollapsed: boolean
  onToggleSidebar: () => void
  onInvite?: () => void
  onCreatePod?: () => void
  onSignOut?: () => void | Promise<void>
  userName?: string
  subscriptionTier?: string
  upgradeAvailable?: boolean
}

export default function WorkspaceHeader({
  sidebarCollapsed,
  onToggleSidebar,
  onInvite,
  onCreatePod,
  onSignOut,
  userName = 'Workspace member',
  subscriptionTier = 'freemium',
  upgradeAvailable = true,
}: WorkspaceHeaderProps) {
  const [profileMenuOpen, setProfileMenuOpen] = useState(false)
  const profileMenuRef = useRef<HTMLDivElement>(null)

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target as Node)) {
        setProfileMenuOpen(false)
      }
    }

    if (profileMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [profileMenuOpen])

  const getInitials = (name: string) => {
    const parts = name.split(' ')
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
    }
    return name.substring(0, 2).toUpperCase()
  }

  const brandGradient = 'from-zinc-700 to-zinc-900'
  const subscriptionLabel = 'Profile'

  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-black/80 backdrop-blur">
      <div className="mx-auto flex w-full max-w-[1400px] items-center justify-between gap-4 px-4 py-4 sm:px-6">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onToggleSidebar}
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-white/70 transition hover:border-white/30 hover:text-white xl:hidden"
            aria-label={sidebarCollapsed ? 'Open navigation' : 'Collapse navigation'}
          >
            <Menu className="h-5 w-5" />
          </button>
          <Link href="/workspace" className="flex items-center gap-3">
            <div className={`flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${brandGradient} shadow-lg shadow-emerald-500/40`}>
              <Image src="/favicon.ico" alt="ChatPye" width={18} height={18} />
            </div>
            <div className="hidden sm:block">
              <p className="text-xs uppercase tracking-[0.35em] text-white/40">ChatPye</p>
              <h1 className="text-lg font-semibold text-white">Workspace</h1>
            </div>
          </Link>
        </div>

        <div className="flex flex-1 items-center justify-end gap-3 sm:gap-4">
          <button
            type="button"
            onClick={onInvite}
            className="hidden items-center gap-2 rounded-xl border border-emerald-400/40 bg-emerald-400/15 px-3 py-2 text-sm font-semibold text-emerald-100 transition hover:border-emerald-300 hover:text-white md:inline-flex"
          >
            <Users className="h-4 w-4" />
            Invite friend
          </button>

          {upgradeAvailable && (
            <button
              type="button"
              onClick={async () => {
                try {
                  const res = await fetch('/api/billing/checkout', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ planId: 'pro', quantity: 1, returnUrl: '/onboarding/success' }),
                  })
                  const data = await res.json()
                  if (data?.checkoutUrl) {
                    window.location.href = data.checkoutUrl
                  }
                } catch {}
              }}
              className="hidden items-center gap-2 rounded-xl border border-blue-400/40 bg-blue-400/15 px-3 py-2 text-sm font-semibold text-blue-100 transition hover:border-blue-300 hover:text-white md:inline-flex"
            >
              <ArrowUpRight className="h-4 w-4" />
              Upgrade to Pro
            </button>
          )}

          <button
            type="button"
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white/70 transition hover:border-white/20 hover:text-white"
            aria-label="Notifications"
          >
            <Bell className="h-5 w-5" />
          </button>

          <div className="relative" ref={profileMenuRef}>
            <button
              type="button"
              onClick={() => setProfileMenuOpen(!profileMenuOpen)}
              className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm text-white/80 transition hover:border-white/25 hover:text-white"
            >
              <span className="block text-left">
                <span className="block text-xs uppercase tracking-[0.2em] text-white/40">{subscriptionLabel}</span>
                <span className="text-sm font-medium text-white/90">{userName}</span>
              </span>
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-700 text-white/80">
                <UserIcon className="h-4 w-4" />
              </div>
            </button>

            {profileMenuOpen && (
              <div className="absolute right-0 top-full mt-2 w-48 rounded-xl border border-white/10 bg-black/90 p-2 shadow-xl">
                <Link
                  href="/workspace/profile"
                  className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-zinc-400 transition hover:bg-zinc-900 hover:text-white"
                  onClick={() => setProfileMenuOpen(false)}
                >
                  <UserIcon className="h-4 w-4" />
                  Profile
                </Link>
                <Link
                  href="/workspace/pods"
                  className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-zinc-400 transition hover:bg-zinc-900 hover:text-white"
                  onClick={() => setProfileMenuOpen(false)}
                >
                  <LayoutDashboard className="h-4 w-4" />
                  Pods
                </Link>
                <button
                  type="button"
                  onClick={() => {
                    onCreatePod?.()
                    setProfileMenuOpen(false)
                  }}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-zinc-400 transition hover:bg-zinc-900 hover:text-white"
                >
                  <Plus className="h-4 w-4" />
                  Create New Pod
                </button>
                <div className="my-2 border-t border-white/10" />
                <Link
                  href="/workspace/settings"
                  className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-zinc-400 transition hover:bg-zinc-900 hover:text-white"
                  onClick={() => setProfileMenuOpen(false)}
                >
                  <Settings className="h-4 w-4" />
                  Settings
                </Link>
                <Link
                  href="/workspace/personalisation"
                  className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-zinc-400 transition hover:bg-zinc-900 hover:text-white"
                  onClick={() => setProfileMenuOpen(false)}
                >
                  <SlidersHorizontal className="h-4 w-4" />
                  Personalisation
                </Link>
                <Link
                  href="/workspace/extension"
                  className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-zinc-400 transition hover:bg-zinc-900 hover:text-white"
                  onClick={() => setProfileMenuOpen(false)}
                >
                  <Zap className="h-4 w-4" />
                  Extension
                </Link>
                <Link
                  href="/workspace/help"
                  className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-zinc-400 transition hover:bg-zinc-900 hover:text-white"
                  onClick={() => setProfileMenuOpen(false)}
                >
                  <HelpCircle className="h-4 w-4" />
                  Help
                </Link>
                <div className="my-2 border-t border-white/10" />
                <button
                  type="button"
                  onClick={() => {
                    setProfileMenuOpen(false)
                    onSignOut?.()
                  }}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-red-400 transition hover:bg-zinc-900 hover:text-red-300"
                >
                  <LogOut className="h-4 w-4" />
                  Sign Out
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}
