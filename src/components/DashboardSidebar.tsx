'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

type SidebarTab = 'overview' | 'settings';

interface SidebarProps {
  activeTab: SidebarTab;
  onSelectTab: (tab: SidebarTab) => void;
}

export function DashboardSidebar({ activeTab, onSelectTab }: SidebarProps) {
  const [variant, setVariant] = useState<'classic' | 'modern'>('modern');

  useEffect(() => {
    const saved = typeof window !== 'undefined' ? localStorage.getItem('dashboard_sidebar_variant') : null;
    if (saved === 'modern' || saved === 'classic') setVariant(saved);
  }, []);

  const setVariantSafe = (v: 'classic' | 'modern') => {
    setVariant(v);
    try { localStorage.setItem('dashboard_sidebar_variant', v); } catch (_) {}
  };

  if (variant === 'modern') {
    return (
      <aside className="w-64 bg-zinc-950 border-r border-zinc-850 p-4 flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <span className="text-sm text-zinc-400">Sidebar</span>
          <button
            onClick={() => setVariantSafe('classic')}
            className="text-xs px-2 py-1 rounded border border-zinc-700 text-zinc-300 hover:bg-zinc-800"
          >
            Revert
          </button>
        </div>

        <nav className="space-y-2">
          <button
            onClick={() => onSelectTab('overview')}
            className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${
              activeTab === 'overview' ? 'bg-blue-600 text-white' : 'text-zinc-300 hover:bg-zinc-900'
            }`}
          >
            Overview
          </button>

          <Link
            href="/dashboard/hr"
            className="block px-3 py-2 rounded-lg text-zinc-300 hover:bg-zinc-900"
          >
            L&amp;D / HR
          </Link>

          <Link
            href="/dashboard/courses"
            className="block px-3 py-2 rounded-lg text-zinc-300 hover:bg-zinc-900"
          >
            Courses
          </Link>

          <Link
            href="/dashboard/referrals"
            className="block px-3 py-2 rounded-lg text-zinc-300 hover:bg-zinc-900"
          >
            Referrals
          </Link>

          <Link
            href="/dashboard/bookmarks"
            className="block px-3 py-2 rounded-lg text-zinc-300 hover:bg-zinc-900"
          >
            Bookmarks
          </Link>

          <Link
            href="/dashboard/notes"
            className="block px-3 py-2 rounded-lg text-zinc-300 hover:bg-zinc-900"
          >
            Notes
          </Link>

          <Link
            href="/dashboard/watch"
            className="block px-3 py-2 rounded-lg text-zinc-300 hover:bg-zinc-900"
          >
            Watch History
          </Link>

          <Link
            href="/extension"
            className="block px-3 py-2 rounded-lg text-zinc-300 hover:bg-zinc-900"
          >
            Extension
          </Link>

          <Link
            href="/dashboard/shared"
            className="block px-3 py-2 rounded-lg text-zinc-300 hover:bg-zinc-900"
          >
            Shared Chats
          </Link>

          <button
            onClick={() => onSelectTab('settings')}
            className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${
              activeTab === 'settings' ? 'bg-zinc-700 text-white' : 'text-zinc-300 hover:bg-zinc-900'
            }`}
          >
            Settings
          </button>
        </nav>

        <div className="mt-auto p-3 rounded-lg bg-gradient-to-r from-blue-600 to-blue-700 text-white">
          <Link href="/pricing" className="flex items-center justify-between">
            <span className="font-semibold">Upgrade to Pro</span>
            <span>→</span>
          </Link>
        </div>
      </aside>
    );
  }

  // classic (existing styling preserved)
  return (
    <aside className="w-64 bg-gradient-to-b from-zinc-950 to-zinc-900 border-r border-zinc-800 p-6 flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <span className="text-sm text-zinc-400">Sidebar</span>
        <button
          onClick={() => setVariantSafe('modern')}
          className="text-xs px-2 py-1 rounded border border-zinc-700 text-zinc-300 hover:bg-zinc-800"
        >
          Try new
        </button>
      </div>
      <nav className="space-y-3">
        <button
          onClick={() => onSelectTab('overview')}
          className={`w-full text-left px-4 py-3 rounded-xl transition-all duration-300 ${
            activeTab === 'overview' 
              ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg shadow-blue-500/25 transform scale-[1.02]' 
              : 'bg-gradient-to-r from-zinc-800/50 to-zinc-700/50 text-zinc-300 hover:from-zinc-700/70 hover:to-zinc-600/70 hover:text-white hover:shadow-lg hover:shadow-zinc-500/10 hover:transform hover:scale-[1.01] border border-zinc-700/30 hover:border-zinc-600/50'
          }`}
        >
          <div className="flex items-center gap-3">
            <div className={`w-2 h-2 rounded-full ${activeTab === 'overview' ? 'bg-white shadow-sm' : 'bg-blue-400'}`}></div>
            <span className="font-medium">Overview</span>
          </div>
        </button>

        <Link
          href="/dashboard/hr"
          className="w-full text-left px-4 py-3 rounded-xl bg-gradient-to-r from-zinc-800/50 to-zinc-700/50 text-zinc-300 hover:from-zinc-700/70 hover:to-zinc-600/70 hover:text-white hover:shadow-lg hover:shadow-zinc-500/10 hover:transform hover:scale-[1.01] border border-zinc-700/30 hover:border-zinc-600/50 transition-all duration-300"
        >
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 bg-cyan-400 rounded-full"></div>
            <span className="font-medium">L&amp;D / HR</span>
          </div>
        </Link>

        <Link
          href="/dashboard/courses"
          className="w-full text-left px-4 py-3 rounded-xl bg-gradient-to-r from-zinc-800/50 to-zinc-700/50 text-zinc-300 hover:from-zinc-700/70 hover:to-zinc-600/70 hover:text-white hover:shadow-lg hover:shadow-zinc-500/10 hover:transform hover:scale-[1.01] border border-zinc-700/30 hover:border-zinc-600/50 transition-all duration-300"
        >
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 bg-indigo-400 rounded-full"></div>
            <span className="font-medium">Courses</span>
          </div>
        </Link>

        <Link
          href="/dashboard/referrals"
          className="w-full text-left px-4 py-3 rounded-xl bg-gradient-to-r from-zinc-800/50 to-zinc-700/50 text-zinc-300 hover:from-zinc-700/70 hover:to-zinc-600/70 hover:text-white hover:shadow-lg hover:shadow-zinc-500/10 hover:transform hover:scale-[1.01] border border-zinc-700/30 hover:border-zinc-600/50 transition-all duration-300"
        >
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 bg-emerald-400 rounded-full"></div>
            <span className="font-medium">Referrals</span>
          </div>
        </Link>

        <Link
          href="/dashboard/bookmarks"
          className="w-full text-left px-4 py-3 rounded-xl bg-gradient-to-r from-zinc-800/50 to-zinc-700/50 text-zinc-300 hover:from-zinc-700/70 hover:to-zinc-600/70 hover:text-white hover:shadow-lg hover:shadow-zinc-500/10 hover:transform hover:scale-[1.01] border border-zinc-700/30 hover:border-zinc-600/50 transition-all duration-300"
        >
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 bg-amber-400 rounded-full"></div>
            <span className="font-medium">Bookmarks</span>
          </div>
        </Link>

        <Link
          href="/dashboard/notes"
          className="w-full text-left px-4 py-3 rounded-xl bg-gradient-to-r from-zinc-800/50 to-zinc-700/50 text-zinc-300 hover:from-zinc-700/70 hover:to-zinc-600/70 hover:text-white hover:shadow-lg hover:shadow-zinc-500/10 hover:transform hover:scale-[1.01] border border-zinc-700/30 hover:border-zinc-600/50 transition-all duration-300"
        >
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 bg-purple-400 rounded-full"></div>
            <span className="font-medium">Notes</span>
          </div>
        </Link>

        <Link
          href="/dashboard/watch"
          className="w-full text-left px-4 py-3 rounded-xl bg-gradient-to-r from-zinc-800/50 to-zinc-700/50 text-zinc-300 hover:from-zinc-700/70 hover:to-zinc-600/70 hover:text-white hover:shadow-lg hover:shadow-zinc-500/10 hover:transform hover:scale-[1.01] border border-zinc-700/30 hover:border-zinc-600/50 transition-all duration-300"
        >
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 bg-rose-400 rounded-full"></div>
            <span className="font-medium">Watch History</span>
          </div>
        </Link>

        <Link
          href="/extension"
          className="w-full text-left px-4 py-3 rounded-xl transition-all duration-300 bg-gradient-to-r from-zinc-800/50 to-zinc-700/50 text-zinc-300 hover:from-zinc-700/70 hover:to-zinc-600/70 hover:text-white hover:shadow-lg hover:shadow-zinc-500/10 hover:transform hover:scale-[1.01] border border-zinc-700/30 hover:border-zinc-600/50"
        >
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 bg-emerald-400 rounded-full"></div>
            <span className="font-medium">Extension</span>
          </div>
        </Link>

        <Link
          href="/dashboard/shared"
          className="w-full text-left px-4 py-3 rounded-xl transition-all duration-300 bg-gradient-to-r from-zinc-800/50 to-zinc-700/50 text-zinc-300 hover:from-zinc-700/70 hover:to-zinc-600/70 hover:text-white hover:shadow-lg hover:shadow-zinc-500/10 hover:transform hover:scale-[1.01] border border-zinc-700/30 hover:border-zinc-600/50"
        >
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 bg-purple-400 rounded-full"></div>
            <span className="font-medium">Shared Chats</span>
          </div>
        </Link>

        <button
          onClick={() => onSelectTab('settings')}
          className={`w-full text-left px-4 py-3 rounded-xl transition-all duration-300 ${
            activeTab === 'settings' 
              ? 'bg-gradient-to-r from-zinc-600 to-zinc-500 text-white shadow-lg shadow-zinc-500/25 transform scale-[1.02]' 
              : 'bg-gradient-to-r from-zinc-800/50 to-zinc-700/50 text-zinc-300 hover:from-zinc-700/70 hover:to-zinc-600/70 hover:text-white hover:shadow-lg hover:shadow-zinc-500/10 hover:transform hover:scale-[1.01] border border-zinc-700/30 hover:border-zinc-600/50'
          }`}
        >
          <div className="flex items-center gap-3">
            <div className={`w-2 h-2 rounded-full ${activeTab === 'settings' ? 'bg-white shadow-sm' : 'bg-slate-400'}`}></div>
            <span className="font-medium">Settings</span>
          </div>
        </button>
      </nav>

      <div className="mt-4">
        <Link
          href="/pricing"
          className="group flex items-center justify-between px-4 py-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 rounded-xl text-white font-medium text-sm transition-all duration-300 border-2 border-blue-500/30 shadow-lg shadow-blue-500/20 hover:shadow-xl hover:shadow-blue-500/30 transform hover:scale-[1.02]"
        >
          <span className="flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            Upgrade to Pro
          </span>
          <span className="transition-transform duration-300 group-hover:translate-x-1">→</span>
        </Link>
      </div>
    </aside>
  );
}


