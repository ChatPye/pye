'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { SignUp, useClerk } from '@clerk/nextjs';
import Link from 'next/link';
import ClerkErrorHandler from '@/components/ClerkErrorHandler';
import { CLERK_SIGN_IN_URL, isClerkPublishableKey } from '@/lib/clerk-env';

export const dynamic = 'force-dynamic';

function SignUpContent() {
  const searchParams = useSearchParams();
  const { loaded } = useClerk();

  useEffect(() => {
    const ref = searchParams.get('ref');
    if (ref) {
      try {
        localStorage.setItem('chatpye_referral_code', ref);
      } catch {
        /* ignore */
      }
    }
  }, [searchParams]);

  const redirectParam = searchParams.get('redirect') || '/workspace';
  const afterUrl = `/auth-callback?redirect=${encodeURIComponent(redirectParam)}`;

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center">
      <ClerkErrorHandler />
      <div className="max-w-md w-full mx-auto px-6">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">Create your account</h1>
          <p className="text-zinc-400">Join ChatPye to supercharge your learning</p>
        </div>

        {!loaded ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white" />
          </div>
        ) : (
          <SignUp
            path="/sign-up"
            routing="path"
            signInUrl={CLERK_SIGN_IN_URL}
            redirectUrl={afterUrl}
            forceRedirectUrl={afterUrl}
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
              },
            }}
          />
        )}

        <p className="mt-6 text-center text-sm text-zinc-500">
          Already have an account?{' '}
          <Link href={CLERK_SIGN_IN_URL} className="text-blue-400 hover:text-blue-300">
            Sign in
          </Link>
        </p>

        <div className="mt-4 text-center text-xs text-zinc-500">
          By signing up, you agree to our{' '}
          <Link href="/terms" className="text-blue-400 hover:text-blue-300 underline">
            Terms
          </Link>{' '}
          and{' '}
          <Link href="/privacy" className="text-blue-400 hover:text-blue-300 underline">
            Privacy Policy
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function SignUpPage() {
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
            Add Clerk keys in Vercel environment variables and redeploy.
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
      <SignUpContent />
    </Suspense>
  );
}
