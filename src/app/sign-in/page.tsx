'use client';

import { Suspense, useEffect, useState } from 'react';
import { SignIn } from '@clerk/nextjs';
import { useSearchParams } from 'next/navigation';
import ClerkErrorHandler from '@/components/ClerkErrorHandler';

export const dynamic = 'force-dynamic';

function SignInContent() {
  const searchParams = useSearchParams();
  const redirectParam = searchParams.get('redirect') || '/workspace';
  const afterSignInUrl = `/auth-callback?redirect=${encodeURIComponent(redirectParam)}`;

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center">
      <ClerkErrorHandler />
      <div className="max-w-md w-full mx-auto px-6">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">Welcome back</h1>
          <p className="text-zinc-400">Signing you in to continue learning with AI</p>
        </div>
        <Suspense fallback={
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
          </div>
        }>
          <SignIn
            path="/sign-in"
            routing="path"
            redirectUrl={afterSignInUrl}
            afterSignInUrl={afterSignInUrl}
            afterSignUpUrl={afterSignInUrl}
            appearance={{
              elements: {
                formButtonPrimary: 'bg-blue-600 hover:bg-blue-700 text-white',
                card: 'bg-zinc-900 border border-zinc-700',
                headerTitle: 'text-white',
                headerSubtitle: 'text-zinc-400',
                socialButtonsBlockButton: 'bg-zinc-800 border-zinc-600 text-white hover:bg-zinc-700',
                formFieldInput: 'bg-zinc-800 border-zinc-600 text-white',
                footerActionLink: 'text-blue-400 hover:text-blue-300',
                formFieldError: 'text-rose-400',
                alertText: 'text-rose-400',
              },
              variables: {
                colorText: '#ffffff',
                colorTextSecondary: '#a1a1aa',
              }
            }}
          />
        </Suspense>
      </div>
    </div>
  );
}

export default function SignInPage() {
  const [clerkAvailable, setClerkAvailable] = useState(false);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    const hasClerkKey = !!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
    setClerkAvailable(hasClerkKey);
    setIsClient(true);
  }, []);

  if (!isClient) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  if (!clerkAvailable) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <p>Authentication not available. Please check your configuration.</p>
        </div>
      </div>
    );
  }

  return <SignInContent />;
}


