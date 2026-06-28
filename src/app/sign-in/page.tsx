'use client';

import { Suspense, useEffect, useState } from 'react';
import { SignIn, useClerk } from '@clerk/nextjs';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import ClerkErrorHandler from '@/components/ClerkErrorHandler';
import { CLERK_SIGN_UP_URL, isClerkPublishableKey } from '@/lib/clerk-env';

export const dynamic = 'force-dynamic';

function SignInContent() {
  const searchParams = useSearchParams();
  const { loaded } = useClerk();
  const redirectParam = searchParams.get('redirect') || '/workspace';
  const afterSignInUrl = `/auth-callback?redirect=${encodeURIComponent(redirectParam)}`;

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center">
      <ClerkErrorHandler />
      <div className="max-w-md w-full mx-auto px-6">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">Welcome back</h1>
          <p className="text-zinc-400">Sign in to continue learning with AI</p>
        </div>

        {!loaded ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white" />
          </div>
        ) : (
          <Suspense
            fallback={
              <div className="flex justify-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white" />
              </div>
            }
          >
            <SignIn
              path="/sign-in"
              routing="path"
              signUpUrl={CLERK_SIGN_UP_URL}
              redirectUrl={afterSignInUrl}
              forceRedirectUrl={afterSignInUrl}
              appearance={{
                elements: {
                  formButtonPrimary: 'bg-blue-600 hover:bg-blue-700 text-white',
                  card: 'bg-zinc-900 border border-zinc-700',
                  headerTitle: 'text-white',
                  headerSubtitle: 'text-zinc-400',
                  socialButtonsBlockButton:
                    'bg-zinc-800 border-zinc-600 text-white hover:bg-zinc-700',
                  formFieldInput: 'bg-zinc-800 border-zinc-600 text-white',
                  footerActionLink: 'text-blue-400 hover:text-blue-300',
                  formFieldError: 'text-rose-400',
                  alertText: 'text-rose-400',
                },
                variables: {
                  colorText: '#ffffff',
                  colorTextSecondary: '#a1a1aa',
                },
              }}
            />
          </Suspense>
        )}

        <p className="mt-6 text-center text-sm text-zinc-500">
          No account?{' '}
          <Link href={CLERK_SIGN_UP_URL} className="text-blue-400 hover:text-blue-300">
            Sign up free
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function SignInPage() {
  const [ready, setReady] = useState(false);
  const [clerkOk, setClerkOk] = useState(false);

  useEffect(() => {
    const key = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
    setClerkOk(isClerkPublishableKey(key));
    setReady(true);
  }, []);

  if (!ready) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white" />
      </div>
    );
  }

  if (!clerkOk) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center px-6">
        <div className="max-w-md text-center space-y-4">
          <h1 className="text-xl font-semibold">Authentication not configured</h1>
          <p className="text-zinc-400 text-sm">
            Add a valid <code className="text-zinc-300">NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY</code> and{' '}
            <code className="text-zinc-300">CLERK_SECRET_KEY</code> in Vercel, then redeploy.
          </p>
        </div>
      </div>
    );
  }

  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-black text-white flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white" />
        </div>
      }
    >
      <SignInContent />
    </Suspense>
  );
}
