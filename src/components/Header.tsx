'use client';

import { useState, useEffect, Suspense } from 'react';
import { Menu, ArrowRight } from 'lucide-react';
import { SignedIn, SignedOut, SignInButton, UserButton, useUser } from '@clerk/nextjs';
import Link from 'next/link';

// Force dynamic rendering to avoid SSR issues with Clerk
export const dynamic = 'force-dynamic';

function HeaderContent() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { user } = useUser();
  const isAdmin = user?.publicMetadata?.role === 'admin';

  return (
    <header className="relative border-b border-zinc-800/80 backdrop-blur supports-[backdrop-filter]:bg-black/30">
      <nav className="mx-auto w-full max-w-6xl px-6 py-4 lg:px-8">
        <div className="grid grid-cols-[auto_auto] items-center justify-between gap-4 md:grid-cols-[auto_1fr_auto]">
          <Link href="/" className="inline-flex items-center gap-2" aria-label="ChatPye">
            <div className="h-7 w-7 rounded-md overflow-hidden">
              <img src="/favicon.ico" alt="ChatPye" className="h-full w-full object-contain" />
            </div>
            <span className="text-sm font-medium">ChatPye</span>
          </Link>

          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="md:hidden inline-flex items-center gap-2 justify-self-end rounded-md border border-zinc-800 px-3 py-2 text-zinc-400 hover:text-white hover:border-zinc-700 transition"
            aria-expanded={isMobileMenuOpen}
            aria-controls="mobileMenu"
          >
            <Menu className="w-4 h-4" />
          </button>

          <div className="hidden items-center justify-center gap-8 md:flex">
            <Link href="/workspace" className="text-sm text-zinc-400 hover:text-white transition-colors">
              Learner
            </Link>
            <Link href="/pyelab" className="text-sm text-zinc-400 hover:text-white transition-colors">
              Pye Lab
            </Link>
            <Link href="/pricing" className="text-sm text-zinc-400 hover:text-white transition-colors">
              Pricing
            </Link>
            <a href="#features" className="text-sm text-zinc-400 hover:text-white transition-colors">
              Features
            </a>
            <Link href="/enterprise" className="text-sm text-zinc-400 hover:text-white transition-colors">
              Enterprise
            </Link>
          </div>

          <div className="hidden items-center justify-end gap-3 md:flex">
          <SignedIn>
            <div className="flex items-center gap-3">
              {isAdmin && (
                <Link href="/admin" className="text-sm text-zinc-300 hover:text-white transition-colors font-medium border border-red-500/30 hover:border-red-500/50 px-3 py-2 rounded-md bg-red-500/5 hover:bg-red-500/10">
                  Admin
                </Link>
              )}
              <UserButton
                afterSignOutUrl="/"
                appearance={{
                  elements: {
                    avatarBox: 'h-9 w-9',
                    userButtonBox: 'rounded-full border border-zinc-700/70'
                  }
                }}
              />
            </div>
          </SignedIn>

          <SignedOut>
            <div className="flex items-center gap-3">
              <SignInButton mode="modal">
                <button className="text-sm text-zinc-300 hover:text-white transition-colors font-medium border border-blue-500/30 hover:border-blue-500/50 px-3 py-2 rounded-md bg-blue-500/5 hover:bg-blue-500/10">
                  Sign in
                </button>
              </SignInButton>
              <Link
                href="#start-learning"
                className="inline-flex items-center gap-2 rounded-md bg-white px-4 py-2 text-sm font-semibold text-black transition hover:bg-zinc-100 shadow-lg"
                onClick={(e) => {
                  e.preventDefault()
                  const element = document.getElementById('start-learning')
                  if (element) {
                    element.scrollIntoView({ behavior: 'smooth', block: 'start' })
                    // Focus on input if it exists
                    setTimeout(() => {
                      const input = element.querySelector('input[type="text"]') as HTMLInputElement
                      if (input) input.focus()
                    }, 500)
                  }
                }}
              >
                Try Now
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </SignedOut>
        </div>
        </div>
      </nav>

      {isMobileMenuOpen && (
        <div id="mobileMenu" className="md:hidden border-t border-zinc-800/80">
          <div className="mx-auto max-w-7xl px-6 py-4 lg:px-8 grid gap-4">
            <Link href="/" className="inline-flex items-center gap-2 text-sm font-medium text-white">
              <div className="h-6 w-6 rounded-md overflow-hidden">
                <img src="/favicon.ico" alt="ChatPye" className="h-full w-full object-contain" />
              </div>
              ChatPye
            </Link>
            <Link href="/pyelab" className="text-sm text-zinc-300">
              Pye Lab
            </Link>
            <a href="#pricing" className="text-sm text-zinc-300">
              Pricing
            </a>
            <a href="#features" className="text-sm text-zinc-300">
              Features
            </a>
            <Link href="/enterprise" className="text-sm text-zinc-300">
              Enterprise
            </Link>
            <div className="flex flex-col gap-3 pt-2">
              <SignedIn>
                <div className="flex items-center gap-3">
                  {isAdmin && (
                    <Link href="/admin" className="text-sm text-zinc-300 hover:text-white transition-colors font-medium border border-red-500/30 hover:border-red-500/50 px-3 py-2 rounded-md bg-red-500/5 hover:bg-red-500/10">
                      Admin
                    </Link>
                  )}
                  <UserButton
                    afterSignOutUrl="/"
                    appearance={{
                      elements: {
                        avatarBox: 'h-9 w-9',
                        userButtonBox: 'rounded-full border border-zinc-700/70'
                      }
                    }}
                  />
                </div>
              </SignedIn>
              <SignedOut>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                  <SignInButton mode="modal">
                    <button className="text-sm text-zinc-300 hover:text-white transition-colors font-medium border border-blue-500/30 hover:border-blue-500/50 px-3 py-2 rounded-md bg-blue-500/5 hover:bg-blue-500/10">
                      Sign in
                    </button>
                  </SignInButton>
                  <Link
                    href="#start-learning"
                    className="inline-flex items-center gap-2 rounded-md bg-white px-3 py-2 text-sm font-semibold text-black transition hover:bg-zinc-100 shadow-lg"
                    onClick={(e) => {
                      e.preventDefault()
                      const element = document.getElementById('start-learning')
                      if (element) {
                        element.scrollIntoView({ behavior: 'smooth', block: 'start' })
                        setTimeout(() => {
                          const input = element.querySelector('input[type="text"]') as HTMLInputElement
                          if (input) input.focus()
                        }, 500)
                      }
                    }}
                  >
                    Try Now
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              </SignedOut>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}

export default function Header() {
  const [clerkAvailable, setClerkAvailable] = useState(false);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    const hasClerkKey = !!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
    setClerkAvailable(hasClerkKey);
    setIsClient(true);
  }, []);

  // Show loading while checking Clerk availability
  if (!isClient) {
    return (
      <header className="relative border-b border-zinc-800/80 backdrop-blur supports-[backdrop-filter]:bg-black/30">
        <nav className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-6 py-4 lg:px-8">
          <Link href="/" className="inline-flex items-center gap-2" aria-label="ChatPye">
            <div className="h-7 w-7 rounded-md overflow-hidden">
              <img src="/favicon.ico" alt="ChatPye" className="h-full w-full object-contain" />
            </div>
            <span className="text-sm font-medium">ChatPye</span>
          </Link>
          <div className="hidden items-center justify-center gap-8 md:flex">
            <a href="/pyelab" className="text-sm text-zinc-400 hover:text-white transition-colors">
              Pye Lab
            </a>
            <a href="#pricing" className="text-sm text-zinc-400 hover:text-white transition-colors">
              Pricing
            </a>
            <a href="#features" className="text-sm text-zinc-400 hover:text-white transition-colors">
              Features
            </a>
            <a href="/enterprise" className="text-sm text-zinc-400 hover:text-white transition-colors">
              Enterprise
            </a>
          </div>
          <div className="hidden items-center gap-3 md:flex">
            <Link href="/start" className="text-sm text-zinc-300 hover:text-white transition-colors font-medium border border-blue-500/30 hover:border-blue-500/50 px-3 py-2 rounded-md bg-blue-500/5 hover:bg-blue-500/10">
              Sign in
            </Link>
            <Link
              href="#start-learning"
              className="inline-flex items-center gap-2 rounded-md bg-white px-4 py-2 text-sm font-medium text-black transition hover:bg-zinc-100"
            >
              Try Now
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </nav>
      </header>
    );
  }

  // If Clerk is not available, show basic header without admin features
  if (!clerkAvailable) {
    return (
      <header className="relative border-b border-zinc-800/80 backdrop-blur supports-[backdrop-filter]:bg-black/30">
        <nav className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-6 py-4 lg:px-8">
          <Link href="/" className="inline-flex items-center gap-2" aria-label="ChatPye">
            <div className="h-7 w-7 rounded-md overflow-hidden">
              <img src="/favicon.ico" alt="ChatPye" className="h-full w-full object-contain" />
            </div>
            <span className="text-sm font-medium">ChatPye</span>
          </Link>
          <div className="hidden items-center justify-center gap-8 md:flex">
            <a href="/pyelab" className="text-sm text-zinc-400 hover:text-white transition-colors">
              Pye Lab
            </a>
            <a href="#pricing" className="text-sm text-zinc-400 hover:text-white transition-colors">
              Pricing
            </a>
            <a href="#features" className="text-sm text-zinc-400 hover:text-white transition-colors">
              Features
            </a>
            <a href="/enterprise" className="text-sm text-zinc-400 hover:text-white transition-colors">
              Enterprise
            </a>
          </div>
          <div className="hidden items-center gap-3 md:flex">
            <Link href="/start" className="text-sm text-zinc-300 hover:text-white transition-colors font-medium border border-blue-500/30 hover:border-blue-500/50 px-3 py-2 rounded-md bg-blue-500/5 hover:bg-blue-500/10">
              Sign in
            </Link>
            <Link
              href="#start-learning"
              className="inline-flex items-center gap-2 rounded-md bg-white px-4 py-2 text-sm font-medium text-black transition hover:bg-zinc-100"
            >
              Try Now
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </nav>
      </header>
    );
  }

  // Render the main header content with Clerk
  return (
    <Suspense fallback={
      <header className="relative border-b border-zinc-800/80 backdrop-blur supports-[backdrop-filter]:bg-black/30">
        <nav className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-6 py-4 lg:px-8">
          <Link href="/" className="inline-flex items-center gap-2" aria-label="ChatPye">
            <div className="h-7 w-7 rounded-md overflow-hidden">
              <img src="/favicon.ico" alt="ChatPye" className="h-full w-full object-contain" />
            </div>
            <span className="text-sm font-medium">ChatPye</span>
          </Link>
          <div className="hidden items-center justify-center gap-8 md:flex">
            <a href="/pyelab" className="text-sm text-zinc-400 hover:text-white transition-colors">
              Pye Lab
            </a>
            <a href="#pricing" className="text-sm text-zinc-400 hover:text-white transition-colors">
              Pricing
            </a>
            <a href="#features" className="text-sm text-zinc-400 hover:text-white transition-colors">
              Features
            </a>
            <a href="/enterprise" className="text-sm text-zinc-400 hover:text-white transition-colors">
              Enterprise
            </a>
          </div>
          <div className="hidden items-center justify-end gap-3 md:flex">
            <Link href="/start" className="text-sm text-zinc-300 hover:text-white transition-colors font-medium border border-blue-500/30 hover:border-blue-500/50 px-3 py-2 rounded-md bg-blue-500/5 hover:bg-blue-500/10">
              Sign in
            </Link>
            <Link
              href="#start-learning"
              className="inline-flex items-center gap-2 rounded-md bg-white px-4 py-2 text-sm font-medium text-black transition hover:bg-zinc-100"
            >
              Get Started
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </nav>
      </header>
    }>
      <HeaderContent />
    </Suspense>
  );
}
