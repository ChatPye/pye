'use client';

import { ClerkProvider } from '@clerk/nextjs';
import React from 'react';

interface OptimizedClerkProviderProps {
  children: React.ReactNode;
  publishableKey?: string | null;
}

// Clerk configuration constants - use environment variables (provided by server) or sensible defaults
const SIGN_IN_FALLBACK_URL = process.env.CLERK_SIGN_IN_FALLBACK_REDIRECT_URL || '/workspace';
const SIGN_UP_FALLBACK_URL = process.env.CLERK_SIGN_UP_FALLBACK_REDIRECT_URL || '/auth-callback?redirect=%2Fworkspace';

const isValidClerkKey = (key: string) =>
  /^pk_(test|live)_[A-Za-z0-9]{20,}$/.test(key);

export function OptimizedClerkProvider({ children, publishableKey }: OptimizedClerkProviderProps) {
  const rawKey = typeof publishableKey === 'string' ? publishableKey.trim() : '';
  const isPlaceholderKey = !rawKey || rawKey === 'pk_test_xxx' || rawKey.endsWith('_xxx');
  const clerkKey =
    isPlaceholderKey || !isValidClerkKey(rawKey) ? null : rawKey;
  const isProduction = process.env.NODE_ENV === 'production';

  // Debug logging (non-blocking)
  try {
    // eslint-disable-next-line no-console
    console.log('🔍 Clerk Configuration Debug:', {
      hasClerkKey: !!clerkKey,
      clerkKeyPrefix: clerkKey ? clerkKey.substring(0, 10) + '...' : null,
      isProduction,
      nodeEnv: process.env.NODE_ENV,
      timestamp: new Date().toISOString(),
    });
  } catch (_) {}

  // If no key is available, do NOT block the app. Render children without auth.
  if (!clerkKey) {
    if (isProduction) {
      // eslint-disable-next-line no-console
      console.error('Clerk publishable key missing in production. Rendering without auth.');
    }
    return <>{children}</>;
  }

  // Soft validation of key format
  if (isProduction && clerkKey.startsWith('pk_test_')) {
    // eslint-disable-next-line no-console
    console.warn('Using test Clerk key in production.');
  }

  return (
    <ClerkProvider
      publishableKey={clerkKey}
      signInFallbackRedirectUrl={SIGN_IN_FALLBACK_URL}
      signUpFallbackRedirectUrl={SIGN_UP_FALLBACK_URL}
    >
      {children}
    </ClerkProvider>
  );
}
