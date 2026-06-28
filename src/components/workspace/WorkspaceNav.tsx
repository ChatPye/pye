'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { ArrowLeft, Bell, Lock, Settings, Users, User } from 'lucide-react';
import { SignedIn, SignedOut, SignInButton, UserButton } from '@clerk/nextjs';
import { UserProfileSidebar } from '@/components/UserProfileSidebar';

interface WorkspaceNavProps {
  processingStatus: string;
  isPreview: boolean;
}

export default function WorkspaceNav({ processingStatus, isPreview }: WorkspaceNavProps) {
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const statusLabel = useMemo(() => {
    if (isPreview) return 'Preview mode';
    switch (processingStatus) {
      case 'complete':
        return 'Workspace ready';
      case 'failed':
        return 'Processing failed';
      case 'transcribing':
        return 'Transcribing audio';
      case 'embedding':
        return 'Indexing content';
      case 'extracting':
        return 'Extracting video data';
      default:
        return 'Preparing workspace';
    }
  }, [processingStatus, isPreview]);

  const badgeClasses = useMemo(() => {
    if (isPreview) {
      return {
        container: 'border border-blue-500/30 bg-blue-500/10 text-blue-200',
        dot: 'bg-blue-500',
      };
    }

    if (processingStatus === 'complete') {
      return {
        container: 'border border-emerald-500/30 bg-emerald-500/10 text-emerald-200',
        dot: 'bg-emerald-500',
      };
    }

    if (processingStatus === 'failed') {
      return {
        container: 'border border-rose-500/30 bg-rose-500/10 text-rose-200',
        dot: 'bg-rose-500',
      };
    }

    return {
      container: 'border border-amber-500/30 bg-amber-500/10 text-amber-200',
      dot: 'bg-amber-400',
    };
  }, [processingStatus, isPreview]);

  return (
    <header className="sticky top-0 z-30 border-b border-zinc-900/80 bg-black/80 backdrop-blur supports-[backdrop-filter]:bg-black/60">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-6 py-4 lg:px-8">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-lg border border-zinc-900 px-3 py-1.5 text-xs text-zinc-400 transition hover:border-zinc-700 hover:text-white"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to landing
          </Link>
          <div className="hidden items-center gap-4 text-xs text-zinc-500 md:flex">
            <span className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs ${badgeClasses.container}`}>
              <span className={`h-2 w-2 rounded-full ${badgeClasses.dot}`} />
              {statusLabel}
            </span>
            <span className="inline-flex items-center gap-1 text-zinc-500">
              <Users className="h-3.5 w-3.5" /> Cohort visibility: default
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden items-center gap-2 md:flex">
            {isPreview && (
              <span className="inline-flex items-center gap-1 rounded-lg border border-blue-500/30 bg-blue-500/10 px-3 py-2 text-[11px] text-blue-200">
                <Lock className="h-3.5 w-3.5" /> Preview mode
              </span>
            )}
            <button className="rounded-lg border border-zinc-900 p-2 text-zinc-400 transition hover:border-zinc-700 hover:text-white">
              <Bell className="h-4 w-4" />
            </button>
            <button className="rounded-lg border border-zinc-900 px-3 py-2 text-xs text-zinc-400 transition hover:border-zinc-700 hover:text-white">
              <Settings className="mr-2 h-3.5 w-3.5" /> Workspace settings
            </button>
          </div>
          <SignedIn>
            <button
              onClick={() => setIsProfileOpen(true)}
              className="flex items-center gap-2 rounded-lg border border-zinc-700/70 px-3 py-2 text-sm text-zinc-300 hover:border-zinc-600 hover:text-white transition-colors"
            >
              <User className="h-4 w-4" />
              Profile
            </button>
          </SignedIn>
          <SignedOut>
            <SignInButton mode="modal">
              <button className="rounded-lg border border-blue-500/30 bg-blue-500/10 px-3 py-2 text-xs font-medium text-blue-200 transition hover:border-blue-500/50 hover:bg-blue-500/20">
                Sign in to interact
              </button>
            </SignInButton>
          </SignedOut>
        </div>
      </div>
      
      <UserProfileSidebar 
        isOpen={isProfileOpen} 
        onClose={() => setIsProfileOpen(false)} 
      />
    </header>
  );
}
