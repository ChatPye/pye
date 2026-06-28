'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { SignUp } from '@clerk/nextjs';

export const dynamic = 'force-dynamic';

function SignUpContent() {
  const [clerkAvailable, setClerkAvailable] = useState(false);
  const [isClient, setIsClient] = useState(false);
  const searchParams = useSearchParams();

  useEffect(() => {
    const hasClerkKey = !!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
    setClerkAvailable(hasClerkKey);
    setIsClient(true);
  }, []);

  // Persist referral code if present
  useEffect(() => {
    const ref = searchParams.get('ref');
    if (ref) {
      try { localStorage.setItem('chatpye_referral_code', ref); } catch (_) {}
    }
  }, [searchParams]);

  const redirectParam = searchParams.get('redirect') || '/workspace';
  const afterUrl = `/auth-callback?redirect=${encodeURIComponent(redirectParam)}`;

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

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center">
      <div className="max-w-md w-full mx-auto px-6">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">Create your account</h1>
          <p className="text-zinc-400">Join ChatPye to supercharge your learning</p>
        </div>

        <SignUp
          routing="hash"
          afterSignInUrl={afterUrl}
          afterSignUpUrl={afterUrl}
          appearance={{
            elements: {
              formButtonPrimary: 'bg-blue-600 hover:bg-blue-700 text-white',
              card: 'bg-zinc-900 border border-zinc-700',
              headerTitle: 'text-white',
              headerSubtitle: 'text-zinc-400',
              socialButtonsBlockButton: 'bg-zinc-800 border-zinc-600 text-white hover:bg-zinc-700',
              formFieldInput: 'bg-zinc-800 border-zinc-600 text-white',
              footerActionLink: 'text-blue-400 hover:text-blue-300',
            }
          }}
        />
        
        {/* Terms and Privacy Policy Notice */}
        <div className="mt-6 text-center text-xs text-zinc-500">
          By signing up, you agree to our{' '}
          <a href="/terms" className="text-blue-400 hover:text-blue-300 underline">
            Terms of Service
          </a>{' '}
          and{' '}
          <a href="/privacy" className="text-blue-400 hover:text-blue-300 underline">
            Privacy Policy
          </a>
        </div>
      </div>
    </div>
  );
}

export default function SignUpPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p>Loading...</p>
        </div>
      </div>
    }>
      <SignUpContent />
    </Suspense>
  );
}