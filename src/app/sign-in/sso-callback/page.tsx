'use client';

import { useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@clerk/nextjs';

function SSOCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isLoaded, isSignedIn } = useAuth();

  useEffect(() => {
    if (!isLoaded) return;

    const signUpFallbackUrl = searchParams.get('sign_up_fallback_redirect_url');
    const signInFallbackUrl = searchParams.get('sign_in_fallback_redirect_url');

    if (isSignedIn) {
      // User is signed in, redirect to appropriate page
      const redirectUrl = signInFallbackUrl || signUpFallbackUrl || '/workspace';
      router.replace(redirectUrl);
    } else {
      // User is not signed in, redirect to sign-in
      router.replace('/sign-in');
    }
  }, [isLoaded, isSignedIn, router, searchParams]);

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
        <p>Processing SSO callback...</p>
      </div>
    </div>
  );
}

export default function SSOCallbackPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p>Loading...</p>
        </div>
      </div>
    }>
      <SSOCallbackContent />
    </Suspense>
  );
}
