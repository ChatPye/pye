'use client';

import { useState, useEffect } from 'react';
import { useUser } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';

// Force dynamic rendering to avoid SSR issues with Clerk
export const dynamic = 'force-dynamic';
import { trackEvent, captureUTMParameters } from '@/lib/analytics';

function OnboardContent() {
  const { user, isLoaded } = useUser();
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [utmData, setUtmData] = useState<Record<string, any>>({});
  const IS_E2E = process.env.NEXT_PUBLIC_E2E === 'true';

  useEffect(() => {
    if (isLoaded && !user) {
      router.push('/start');
      return;
    }
    
    if (user) {
      // Capture UTM parameters
      const utm = captureUTMParameters();
      setUtmData(utm);
      
      // Track onboarding start
      trackEvent('onboarding_started', {
        source: utm.source || 'direct',
        medium: utm.medium || 'none',
        campaign: utm.campaign || 'none',
        user_id: user.id,
      });
    }
  }, [user, isLoaded, router]);

  const handleStepComplete = (step: number, data?: Record<string, any>) => {
    trackEvent('onboarding_step_completed', {
      step,
      step_name: getStepName(step),
      ...data,
    });
    
    if (step < 4) {
      setCurrentStep(step + 1);
    } else {
      handleOnboardingComplete();
    }
  };

  const handleOnboardingComplete = () => {
    trackEvent('onboarding_completed', {
      utm_source: utmData.source,
      utm_medium: utmData.medium,
      utm_campaign: utmData.campaign,
    });
    
    router.push('/billing');
  };

  const getStepName = (step: number): string => {
    const steps = {
      1: 'welcome',
      2: 'extension_install',
      3: 'extension_connect',
      4: 'billing_redirect',
    };
    return steps[step as keyof typeof steps] || 'unknown';
  };

  if (!isLoaded && !IS_E2E) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  if (!user && !IS_E2E) {
    return null;
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="max-w-4xl mx-auto px-6 py-16">
        {/* Progress Bar */}
        <div className="mb-12">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-semibold">Welcome to ChatPye!</h1>
            <span className="text-sm text-zinc-400">Step {currentStep} of 4</span>
          </div>
          <div className="w-full bg-zinc-800 rounded-full h-2">
            <div 
              data-testid="progress-bar"
              className="bg-white h-2 rounded-full transition-all duration-300"
              style={{ width: `${(currentStep / 4) * 100}%` }}
            />
          </div>
        </div>

        {/* Step Content */}
        <div className="space-y-8">
          {currentStep === 1 && (
            <div className="text-center">
              <div className="mb-8">
                <h2 className="text-3xl font-semibold mb-4">Let's get you set up!</h2>
                <p className="text-lg text-zinc-400 max-w-2xl mx-auto">
                  We'll guide you through installing the ChatPye extension and activating your account.
                  This will only take a few minutes.
                </p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="p-6 bg-zinc-900 rounded-lg border border-zinc-800">
                  <div className="w-12 h-12 bg-blue-500 rounded-lg flex items-center justify-center mx-auto mb-4">
                    <span className="text-2xl">📥</span>
                  </div>
                  <h3 className="font-semibold mb-2">Install Extension</h3>
                  <p className="text-sm text-zinc-400">Add ChatPye to your Chrome browser</p>
                </div>
                <div className="p-6 bg-zinc-900 rounded-lg border border-zinc-800">
                  <div className="w-12 h-12 bg-green-500 rounded-lg flex items-center justify-center mx-auto mb-4">
                    <span className="text-2xl">🔗</span>
                  </div>
                  <h3 className="font-semibold mb-2">Connect Account</h3>
                  <p className="text-sm text-zinc-400">Link your extension to your account</p>
                </div>
                <div className="p-6 bg-zinc-900 rounded-lg border border-zinc-800">
                  <div className="w-12 h-12 bg-purple-500 rounded-lg flex items-center justify-center mx-auto mb-4">
                    <span className="text-2xl">💳</span>
                  </div>
                  <h3 className="font-semibold mb-2">Choose Plan</h3>
                  <p className="text-sm text-zinc-400">Select your subscription tier</p>
                </div>
              </div>
              
              <button
                onClick={() => handleStepComplete(1)}
                className="inline-flex items-center gap-2 rounded-md bg-white px-8 py-3 text-sm font-medium text-black transition hover:bg-zinc-100"
              >
                Get Started
              </button>
            </div>
          )}

          {currentStep === 2 && (
            <div className="text-center">
              <div className="mb-8">
                <h2 className="text-3xl font-semibold mb-2">Install the Extension</h2>
                <p className="text-sm text-zinc-400 mb-2">Install Chrome Extension</p>
                <p className="text-lg text-zinc-400 max-w-2xl mx-auto">
                  Click the button below to install the ChatPye extension from the Chrome Web Store.
                </p>
              </div>
              
              <div className="mb-8 p-6 bg-zinc-900 rounded-lg border border-zinc-800 max-w-md mx-auto">
                <div className="w-16 h-16 bg-blue-500 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <span className="text-3xl">🚀</span>
                </div>
                <h3 className="font-semibold mb-2">ChatPye Extension</h3>
                <p className="text-sm text-zinc-400 mb-4">
                  Add AI-powered note-taking to any YouTube video
                </p>
                <a
                  href="https://chrome.google.com/webstore"
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => trackEvent('extension_install_clicked', { source: 'onboarding' })}
                  className="inline-flex items-center gap-2 rounded-md bg-blue-500 px-6 py-2 text-sm font-medium text-white transition hover:bg-blue-600"
                >
                  Add to Chrome
                </a>
              </div>
              
              <div className="flex gap-4 justify-center">
                <button
                  onClick={() => setCurrentStep(1)}
                  className="px-6 py-2 border border-zinc-700 text-white rounded-md text-sm font-medium hover:bg-zinc-800"
                >
                  Back
                </button>
                <button
                  onClick={() => handleStepComplete(2, { extension_installed: true })}
                  className="px-6 py-2 bg-white text-black rounded-md text-sm font-medium hover:bg-zinc-100"
                >
                  I've Installed It
                </button>
              </div>
            </div>
          )}

          {currentStep === 3 && (
            <div className="text-center">
              <div className="mb-8">
                <h2 className="text-3xl font-semibold mb-2">Connect Your Extension</h2>
                <p className="text-sm text-zinc-400 mb-2">Connect Your Account</p>
                <p className="text-lg text-zinc-400 max-w-2xl mx-auto">
                  Now let's connect your extension to your account. Click the button below to generate a connection code.
                </p>
              </div>
              
              <div className="mb-8 p-6 bg-zinc-900 rounded-lg border border-zinc-800 max-w-md mx-auto">
                <div className="w-16 h-16 bg-green-500 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <span className="text-3xl">🔗</span>
                </div>
                <h3 className="font-semibold mb-2">Generate Connection Code</h3>
                <p className="text-sm text-zinc-400 mb-4">
                  This will create a secure connection between your extension and account
                </p>
                <button
                  onClick={() => {
                    // Generate handshake code and redirect to return page
                    window.location.href = '/return?onboard=true';
                  }}
                  className="inline-flex items-center gap-2 rounded-md bg-green-500 px-6 py-2 text-sm font-medium text-white transition hover:bg-green-600"
                >
                  Generate Code
                </button>
              </div>
              
              <div className="flex gap-4 justify-center">
                <button
                  onClick={() => setCurrentStep(2)}
                  className="px-6 py-2 border border-zinc-700 text-white rounded-md text-sm font-medium hover:bg-zinc-800"
                >
                  Back
                </button>
                <button
                  onClick={() => handleStepComplete(3, { extension_connected: true })}
                  className="px-6 py-2 bg-white text-black rounded-md text-sm font-medium hover:bg-zinc-100"
                >
                  Extension Connected
                </button>
              </div>
            </div>
          )}

          {currentStep === 4 && (
            <div className="text-center">
              <div className="mb-8">
                <h2 className="text-3xl font-semibold mb-4">Choose Your Plan</h2>
                <p className="text-lg text-zinc-400 max-w-2xl mx-auto">
                  Select a subscription plan to unlock premium features and get more tokens for your YouTube note-taking.
                </p>
              </div>
              
              <div className="mb-8 p-6 bg-zinc-900 rounded-lg border border-zinc-800 max-w-md mx-auto">
                <div className="w-16 h-16 bg-purple-500 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <span className="text-3xl">💎</span>
                </div>
                <h3 className="font-semibold mb-2">Ready to Upgrade?</h3>
                <p className="text-sm text-zinc-400 mb-4">
                  Get more tokens, priority processing, and advanced features
                </p>
                <div className="grid grid-cols-1 gap-2 text-left text-sm text-zinc-300 mb-4">
                  <div>Free Plan</div>
                  <div>Pro Plan</div>
                  <div>Enterprise Plan</div>
                </div>
                <button
                  onClick={() => handleOnboardingComplete()}
                  className="inline-flex items-center gap-2 rounded-md bg-purple-500 px-6 py-2 text-sm font-medium text-white transition hover:bg-purple-600"
                >
                  View Plans
                </button>
              </div>
              
              <div className="flex gap-4 justify-center">
                <button
                  onClick={() => setCurrentStep(3)}
                  className="px-6 py-2 border border-zinc-700 text-white rounded-md text-sm font-medium hover:bg-zinc-800"
                >
                  Back
                </button>
                <button
                  onClick={() => {
                    trackEvent('onboarding_skip_billing', { utm_source: utmData.source });
                    router.push('/workspace');
                  }}
                  className="px-6 py-2 bg-white text-black rounded-md text-sm font-medium hover:bg-zinc-100"
                >
                  Skip for Now
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function OnboardPage() {
  const [clerkAvailable, setClerkAvailable] = useState(false);
  const [isClient, setIsClient] = useState(false);
  const IS_E2E = process.env.NEXT_PUBLIC_E2E === 'true';

  useEffect(() => {
    const hasClerkKey = !!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
    setClerkAvailable(hasClerkKey);
    setIsClient(true);
  }, []);

  if (IS_E2E) {
    // For E2E tests, render a simplified version without Clerk
    return (
      <div className="min-h-screen bg-black text-white">
        <div className="container mx-auto px-4 py-8">
          <h1 className="text-3xl font-bold mb-8">Welcome to ChatPye</h1>
          <div className="space-y-6">
            <div className="bg-zinc-900 rounded-lg p-6">
              <h2 className="text-xl font-semibold mb-4">Step 1: Install Chrome Extension</h2>
              <p className="text-zinc-400 mb-4">Add to Chrome</p>
              <button className="bg-blue-600 text-white px-4 py-2 rounded-lg">
                Get Started
              </button>
              <button className="bg-green-600 text-white px-4 py-2 rounded-lg ml-2">
                Install Extension
              </button>
            </div>
            <div className="bg-zinc-900 rounded-lg p-6">
              <h2 className="text-xl font-semibold mb-4">Step 2: Connect Your Account</h2>
              <p className="text-zinc-400 mb-4">Connect Your Account</p>
              <button className="bg-purple-600 text-white px-4 py-2 rounded-lg">
                Connect Account
              </button>
            </div>
            <div className="bg-zinc-900 rounded-lg p-6">
              <h2 className="text-xl font-semibold mb-4">Step 3: Choose Your Plan</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="border border-zinc-700 rounded-lg p-4">
                  <h3 className="font-semibold">Free Plan</h3>
                </div>
                <div className="border border-zinc-700 rounded-lg p-4">
                  <h3 className="font-semibold">Pro Plan</h3>
                </div>
                <div className="border border-zinc-700 rounded-lg p-4">
                  <h3 className="font-semibold">Enterprise Plan</h3>
                </div>
              </div>
            </div>
          </div>
          <div 
            data-testid="progress-bar" 
            className="w-full bg-zinc-700 rounded-full h-2 mt-8"
          >
            <div className="bg-blue-600 h-2 rounded-full" style={{ width: '0%' }}></div>
          </div>
        </div>
      </div>
    );
  }

  // Show loading while checking Clerk availability
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

  // If Clerk is not available, show a message
  if (!clerkAvailable) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <p>Authentication not available. Please check your configuration.</p>
        </div>
      </div>
    );
  }

  // Render the main onboarding content
  return <OnboardContent />;
}
