'use client';

import { Suspense, lazy, useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';

// Extend Window interface to include Clerk
declare global {
  interface Window {
    Clerk?: any;
  }
}

// Lazy load Clerk components for better performance
const SignIn = lazy(() => import('@clerk/nextjs').then(module => ({ default: module.SignIn })));
const SignUp = lazy(() => import('@clerk/nextjs').then(module => ({ default: module.SignUp })));

interface LazyClerkProviderProps {
  isSignUp: boolean;
  onSignUpChange: (isSignUp: boolean) => void;
  referralCode?: string | null;
}

// Loading component for Clerk forms
function ClerkLoadingFallback() {
  return (
    <div className="flex items-center justify-center p-8 border border-zinc-800 rounded-lg bg-zinc-900 min-h-[400px]">
      <div className="text-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-400 mx-auto mb-4" />
        <p className="text-zinc-400">Loading authentication...</p>
      </div>
    </div>
  );
}

// Error boundary for Clerk components
function ClerkErrorFallback({ error, resetError }: { error: Error; resetError: () => void }) {
  return (
    <div className="p-8 border border-red-500/30 rounded-lg bg-red-900/10 min-h-[400px] flex items-center justify-center">
      <div className="text-center">
        <h3 className="text-red-400 font-semibold mb-2">Authentication Error</h3>
        <p className="text-zinc-400 mb-4">There was an issue loading the authentication form.</p>
        <button
          onClick={resetError}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
        >
          Try Again
        </button>
      </div>
    </div>
  );
}

// Optimized Clerk form component
export function LazyClerkForm({ isSignUp, onSignUpChange, referralCode }: LazyClerkProviderProps) {
  const [hasError, setHasError] = useState(false);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const resetError = () => {
    setHasError(false);
  };

  if (!isClient) {
    return <ClerkLoadingFallback />;
  }

  if (hasError) {
    return <ClerkErrorFallback error={new Error('Clerk loading failed')} resetError={resetError} />;
  }

  const clerkAppearance = {
    variables: {
      colorPrimary: '#3b82f6',
      colorBackground: '#09090b',
      colorInputBackground: '#18181b',
      colorInputText: '#ffffff',
      borderRadius: '0.5rem',
    },
    elements: {
      card: 'bg-zinc-900 border-zinc-800 shadow-lg',
      headerTitle: 'text-white font-semibold',
      headerSubtitle: 'text-zinc-400',
      formButtonPrimary: 'bg-white text-black hover:bg-zinc-100 font-medium transition-colors',
      formFieldInput: 'bg-zinc-800 border-zinc-700 text-white placeholder-zinc-400 focus:border-blue-500',
      formFieldLabel: 'text-zinc-300 font-medium',
      socialButtonsBlockButton: 'bg-zinc-800 border-zinc-700 text-white hover:bg-zinc-700 transition-colors',
      footerActionLink: 'text-blue-400 hover:text-blue-300 transition-colors',
      identityPreviewText: 'text-zinc-400',
      formResendCodeLink: 'text-blue-400 hover:text-blue-300 transition-colors',
      formField: 'transition-none',
      formButton: 'transition-colors',
    },
    layout: {
      socialButtonsPlacement: 'bottom' as const,
      showOptionalFields: false,
    }
  };

  return (
    <Suspense fallback={<ClerkLoadingFallback />}>
      {isSignUp ? (
        <SignUp 
          appearance={clerkAppearance}
        />
      ) : (
        <SignIn 
          appearance={clerkAppearance}
        />
      )}
    </Suspense>
  );
}

// Performance monitoring for Clerk
export function useClerkPerformance() {
  useEffect(() => {
    // Monitor Clerk loading performance
    const startTime = performance.now();
    
    const handleClerkLoad = () => {
      const loadTime = performance.now() - startTime;
      console.log(`Clerk loaded in ${loadTime.toFixed(2)}ms`);
      
      // Track performance metrics
      if (typeof window !== 'undefined' && window.gtag) {
        window.gtag('event', 'clerk_load_time', {
          event_category: 'Performance',
          value: Math.round(loadTime),
        });
      }
    };

    // Check if Clerk is already loaded
    if (typeof window !== 'undefined' && window.Clerk) {
      handleClerkLoad();
    } else {
      // Wait for Clerk to load
      const checkClerk = setInterval(() => {
        if (typeof window !== 'undefined' && window.Clerk) {
          clearInterval(checkClerk);
          handleClerkLoad();
        }
      }, 100);

      // Cleanup after 10 seconds
      setTimeout(() => clearInterval(checkClerk), 10000);
    }
  }, []);
}
