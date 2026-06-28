'use client';

import { ClerkProvider } from '@clerk/nextjs';
import React from 'react';
import {
  CLERK_SIGN_IN_FALLBACK_URL,
  CLERK_SIGN_IN_URL,
  CLERK_SIGN_UP_FALLBACK_URL,
  CLERK_SIGN_UP_URL,
  isClerkPublishableKey,
} from '@/lib/clerk-env';

interface OptimizedClerkProviderProps {
  children: React.ReactNode;
  publishableKey?: string | null;
}

export function OptimizedClerkProvider({ children, publishableKey }: OptimizedClerkProviderProps) {
  const rawKey = typeof publishableKey === 'string' ? publishableKey.trim() : '';
  const clerkKey = isClerkPublishableKey(rawKey) ? rawKey : null;

  if (!clerkKey) {
    if (process.env.NODE_ENV === 'production') {
      console.error(
        'Clerk publishable key missing or invalid. Set NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY in Vercel.'
      );
    }
    return <>{children}</>;
  }

  return (
    <ClerkProvider
      publishableKey={clerkKey}
      signInUrl={CLERK_SIGN_IN_URL}
      signUpUrl={CLERK_SIGN_UP_URL}
      signInFallbackRedirectUrl={CLERK_SIGN_IN_FALLBACK_URL}
      signUpFallbackRedirectUrl={CLERK_SIGN_UP_FALLBACK_URL}
      afterSignOutUrl="/"
    >
      {children}
    </ClerkProvider>
  );
}
