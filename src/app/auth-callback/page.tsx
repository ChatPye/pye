'use client';

import { useEffect, useState, useCallback, useMemo, Suspense } from 'react';
import { useUser } from '@clerk/nextjs';
import { useRouter, useSearchParams } from 'next/navigation';
import { useUnifiedRouting, getLoginSource, getWorkspacePath } from '@/lib/routing';

export const dynamic = 'force-dynamic';

function AuthCallbackContent() {
  const { user, isLoaded } = useUser();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { redirectToWorkspace, redirectToSignIn } = useUnifiedRouting();
  const [processing, setProcessing] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Memoize expensive calculations
  const isNewUser = useMemo(() => {
    if (!user?.createdAt) return false;
    const userCreatedAt = new Date(user.createdAt);
    return (Date.now() - userCreatedAt.getTime()) < 30000; // 30 seconds
  }, [user?.createdAt]);

  const redirectParam = useMemo(() => {
    const raw = searchParams.get('redirect');
    if (!raw) return null;
    try {
      return decodeURIComponent(raw);
    } catch (error) {
      console.warn('Failed to decode redirect param, falling back to raw value:', error);
      return raw;
    }
  }, [searchParams]);

  // Optimized referral processing with caching and timeout
  const processReferralCode = useCallback(async (): Promise<boolean> => {
    const storedReferralCode = typeof window !== 'undefined' 
      ? localStorage.getItem('chatpye_referral_code') 
      : null;
    
    if (!storedReferralCode) return false;

    try {
      // Add timeout to prevent hanging
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

      const response = await fetch('/api/referrals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'use_referral_code', referralCode: storedReferralCode }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) return false;

      const result = await response.json();
      if (result?.success) {
        localStorage.removeItem('chatpye_referral_code');
        return true;
      }
      return false;
    } catch (error) {
      if ((error as DOMException)?.name === 'AbortError') {
        console.warn('Referral processing timeout');
      } else {
        console.warn('Referral processing failed:', error);
      }
      return false;
    }
  }, []);

  useEffect(() => {
    let timeoutId: NodeJS.Timeout;

    const handlePostAuth = async () => {
      if (!isLoaded) return;

      // Early return for unauthenticated users
      if (!user) {
        console.log('No user found, redirecting to sign-in');
        const loginSource = getLoginSource(searchParams);
        redirectToSignIn(loginSource);
        return;
      }

      console.log('User authenticated, processing redirect...');

      // Set a maximum timeout to prevent infinite spinner
      timeoutId = setTimeout(() => {
        console.warn('Auth callback timeout - redirecting to workspace');
        setProcessing(false);
        const loginSource = getLoginSource(searchParams);
        router.replace(getWorkspacePath(loginSource));
      }, 8000); // Reduced to 8 seconds

      try {
        const loginSource = getLoginSource(searchParams);
        const redirectTarget = redirectParam || getWorkspacePath(loginSource);
        console.log('Redirect target:', redirectTarget);

        const shouldProcessReferral = Boolean(redirectParam || isNewUser);

        if (shouldProcessReferral) {
          console.log('Processing referral code...');
          await Promise.race([
            processReferralCode(),
            new Promise((resolve) => setTimeout(resolve, 3000)) // Reduced timeout
          ]);
        }

        console.log('Redirecting to workspace with source tracking');
        redirectToWorkspace(loginSource);
      } catch (error) {
        console.error('Auth callback error:', error);
        setError(error instanceof Error ? error.message : 'Unknown error');
        // Fallback to dashboard on error
        setTimeout(() => {
          console.log('Fallback redirect to workspace');
          const loginSource = getLoginSource(searchParams);
          redirectToWorkspace(loginSource);
        }, 1000);
      } finally {
        clearTimeout(timeoutId);
        setProcessing(false);
      }
    };

    // Add a small delay to ensure Clerk is fully loaded
    const delayId = setTimeout(handlePostAuth, 100);

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
      if (delayId) clearTimeout(delayId);
    };
  }, [isLoaded, user, router, redirectParam, isNewUser, processReferralCode]);

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center">
      <div className="text-center">
        {error ? (
          <>
            <div className="text-red-400 mb-4">⚠️</div>
            <p className="text-red-400 mb-2">Something went wrong</p>
            <p className="text-zinc-400 text-sm mb-4">{error}</p>
            <p className="text-zinc-500 text-sm">Redirecting to dashboard...</p>
          </>
        ) : (
          <>
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
            <p>{processing ? 'Finalizing sign in…' : 'Redirecting…'}</p>
          </>
        )}
      </div>
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p>Loading...</p>
        </div>
      </div>
    }>
      <AuthCallbackContent />
    </Suspense>
  );
}

