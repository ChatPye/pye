'use client';

import { useState, useEffect } from 'react';
import { useUser, useSignUp, useSignIn } from '@clerk/nextjs';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowRight, CheckCircle, Download, ExternalLink, Users, Gift, Copy } from 'lucide-react';

// Force dynamic rendering to avoid SSR issues with Clerk
export const dynamic = 'force-dynamic';

// Wrapper component to handle Clerk availability
function ExtensionContent() {
  const { user, isLoaded } = useUser();
  const { signUp, setActive } = useSignUp();
  const { signIn, setActive: setActiveSignIn } = useSignIn();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [installationStep, setInstallationStep] = useState(1);
  const [isExtensionInstalled, setIsExtensionInstalled] = useState(false);
  const [referralCode, setReferralCode] = useState<string | null>(null);
  const [showReferralSection, setShowReferralSection] = useState(false);
  const [referralData, setReferralData] = useState<any>(null);
  const [copySuccess, setCopySuccess] = useState(false);

  useEffect(() => {
    // Check if extension is installed
    const checkExtension = () => {
      // This would check if the extension is installed
      // For now, we'll simulate the check
      const installed = localStorage.getItem('chatpye-extension-installed') === 'true';
      setIsExtensionInstalled(installed);
    };

    // Check for referral code in URL
    const refCode = searchParams.get('ref');
    if (refCode) {
      setReferralCode(refCode);
      setShowReferralSection(true);
      // Store referral code for later processing
      localStorage.setItem('chatpye_referral_code', refCode);
    }

    checkExtension();
    
    // Listen for extension installation messages
    const handleMessage = (event: MessageEvent) => {
      if (event.data.type === 'CHATPYE_EXTENSION_INSTALLED') {
        setIsExtensionInstalled(true);
        setInstallationStep(3);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [searchParams]);

  const handleInstallClick = () => {
    // Track installation attempt
    if (typeof window !== 'undefined') {
      window.gtag?.('event', 'extension_install_clicked', {
        event_category: 'extension',
        event_label: 'chrome_web_store'
      });
    }
    
    // Open Chrome Web Store - Update this URL when your app is approved
    // Current: Generic Chrome Web Store
    // Future: https://chrome.google.com/webstore/detail/chatpye/your-extension-id
    window.open('https://chrome.google.com/webstore', '_blank');
  };

  const handleExtensionConnected = () => {
    if (user) {
      // User is already signed in, go to dashboard
      router.push('/workspace');
    } else {
      // User needs to sign in, go to start page
      router.push('/start');
    }
  };

  // Handle referral signup
  const handleReferralSignup = () => {
    if (!referralCode) return;
    
    // Redirect to signup with referral code
    router.push(`/sign-up?ref=${referralCode}`);
  };

  // Get user's referral data
  const fetchReferralData = async () => {
    if (!user) return;

    try {
      const response = await fetch('/api/referrals', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'get_referral_info'
        })
      });

      if (response.ok) {
        const data = await response.json();
        setReferralData(data);
      }
    } catch (error) {
      console.error('Error fetching referral data:', error);
    }
  };

  // Copy referral link to clipboard
  const copyReferralLink = async () => {
    if (!referralData?.referralUrl) return;

    try {
      await navigator.clipboard.writeText(referralData.referralUrl);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  // Fetch referral data when user is loaded
  useEffect(() => {
    if (user && isLoaded) {
      fetchReferralData();
    }
  }, [user, isLoaded]);

  const steps = [
    {
      id: 1,
      title: 'Install Extension',
      description: 'Add ChatPye to your Chrome browser',
      icon: '📥',
      completed: isExtensionInstalled
    },
    {
      id: 2,
      title: 'Open YouTube',
      description: 'Navigate to any YouTube video',
      icon: '🎥',
      completed: installationStep > 1
    },
    {
      id: 3,
      title: 'Sign In & Connect',
      description: 'Sign in to connect your account',
      icon: '🔗',
      completed: installationStep > 2
    }
  ];

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="max-w-4xl mx-auto px-6 py-16">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4">Install ChatPye Extension</h1>
          <p className="text-xl text-zinc-400 max-w-2xl mx-auto">
            Transform any YouTube video into an interactive learning experience with AI-powered notes, 
            smart bookmarks, and contextual chat.
          </p>
        </div>

        {/* Onboarding removed on Extension dashboard */}

        {/* Onboarding removed on Extension dashboard */}

        {/* User's Referral Section */}
        {user && referralData && (
          <div className="bg-gradient-to-r from-green-500/10 to-blue-500/10 border border-green-500/30 rounded-xl p-8 mb-12">
            <div className="text-center">
              <div className="w-16 h-16 bg-green-500 rounded-xl flex items-center justify-center mx-auto mb-4">
                <Users className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-2xl font-bold mb-2">Share ChatPye & Earn Rewards</h2>
              <p className="text-zinc-300 mb-6 max-w-2xl mx-auto">
                Invite friends to join ChatPye and earn rewards for every successful referral. 
                You've referred <span className="text-green-400 font-semibold">{referralData.completedReferrals}</span> people so far!
              </p>
              
              <div className="bg-zinc-800/50 rounded-lg p-4 mb-6">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="text-sm text-zinc-400 mb-1">Your Referral Link</p>
                    <p className="text-white font-mono text-sm break-all">{referralData.referralUrl}</p>
                  </div>
                  <button
                    onClick={copyReferralLink}
                    className="ml-4 flex items-center gap-2 rounded-lg bg-zinc-700 px-4 py-2 text-white hover:bg-zinc-600 transition"
                  >
                    <Copy className="w-4 h-4" />
                    {copySuccess ? 'Copied!' : 'Copy'}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
                <div className="bg-zinc-800/30 rounded-lg p-4">
                  <p className="text-2xl font-bold text-green-400">{referralData.totalReferrals}</p>
                  <p className="text-sm text-zinc-400">Total Referrals</p>
                </div>
                <div className="bg-zinc-800/30 rounded-lg p-4">
                  <p className="text-2xl font-bold text-blue-400">{referralData.completedReferrals}</p>
                  <p className="text-sm text-zinc-400">Completed</p>
                </div>
                <div className="bg-zinc-800/30 rounded-lg p-4">
                  <p className="text-2xl font-bold text-purple-400">{referralData.totalRewards?.credits || 0}</p>
                  <p className="text-sm text-zinc-400">Credits Earned</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Installation steps removed from dashboard */}

        {/* Main Installation CTA */}
        <div className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-500/30 rounded-2xl p-8 text-center mb-8">
          <div className="w-20 h-20 bg-blue-500 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <span className="text-4xl">🚀</span>
          </div>
          
          <h2 className="text-3xl font-bold mb-4">Ready to Get Started?</h2>
          <p className="text-lg text-zinc-400 mb-8 max-w-2xl mx-auto">
            Install the ChatPye extension and start taking AI-powered notes on any YouTube video. 
            It only takes 30 seconds!
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-6">
            <button
              onClick={handleInstallClick}
              className="inline-flex items-center gap-3 rounded-lg bg-white px-8 py-4 text-lg font-medium text-black transition hover:bg-zinc-100 hover:scale-105"
            >
              <Download className="w-6 h-6" />
              Install from Chrome Web Store
              <ExternalLink className="w-5 h-5" />
            </button>
            <button
              onClick={async () => {
                try {
                  const res = await fetch('/api/billing/checkout', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ planId: 'pro', quantity: 1, returnUrl: '/onboarding/success' }),
                  })
                  const data = await res.json()
                  if (data?.checkoutUrl) {
                    window.location.href = data.checkoutUrl
                  }
                } catch {}
              }}
              className="inline-flex items-center gap-3 rounded-lg border border-blue-500/40 px-8 py-4 text-lg font-medium text-blue-200 transition hover:bg-blue-500/10 hover:scale-105"
            >
              Upgrade to Pro
              <ExternalLink className="w-5 h-5" />
            </button>
          </div>

          <p className="text-sm text-zinc-500">
            Free to install • No credit card required • Works on all YouTube videos
          </p>
        </div>

        {/* Features Preview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <div className="bg-zinc-900 rounded-xl p-6 border border-zinc-800">
            <div className="w-12 h-12 bg-green-500 rounded-lg flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl">📝</span>
            </div>
            <h4 className="font-semibold mb-2">Smart Notes</h4>
            <p className="text-sm text-zinc-400">
              Take AI-powered notes with automatic timestamp references. Never miss important information again.
            </p>
          </div>
          <div className="bg-zinc-900 rounded-xl p-6 border border-zinc-800">
            <div className="w-12 h-12 bg-blue-500 rounded-lg flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl">💬</span>
            </div>
            <h4 className="font-semibold mb-2">Contextual Chat</h4>
            <p className="text-sm text-zinc-400">
              Ask questions about video content and get instant AI-powered answers with timestamp references.
            </p>
          </div>
          <div className="bg-zinc-900 rounded-xl p-6 border border-zinc-800">
            <div className="w-12 h-12 bg-purple-500 rounded-lg flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl">🔖</span>
            </div>
            <h4 className="font-semibold mb-2">Smart Bookmarks</h4>
            <p className="text-sm text-zinc-400">
              Automatically bookmark important moments and create a personalized learning library.
            </p>
          </div>
        </div>

        {/* Next Steps */}
        {isExtensionInstalled && (
          <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-6 text-center">
            <div className="w-16 h-16 bg-green-500 rounded-xl flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-white" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Extension Installed! 🎉</h3>
            <p className="text-zinc-400 mb-6">
              Great! Now open any YouTube video and look for the ChatPye icon. 
              Click it to sign in and start using the extension.
            </p>
            <button
              onClick={handleExtensionConnected}
              className="inline-flex items-center gap-2 rounded-lg bg-green-500 px-6 py-3 text-white font-medium hover:bg-green-600 transition"
            >
              Continue to Dashboard
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        )}

        {/* Help Section */}
        <div className="text-center">
          <h3 className="text-lg font-semibold mb-4">Need Help?</h3>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href="/help"
              className="text-blue-400 hover:text-blue-300 transition"
            >
              Installation Guide
            </a>
            <a
              href="/contact"
              className="text-blue-400 hover:text-blue-300 transition"
            >
              Contact Support
            </a>
            <a
              href="/faq"
              className="text-blue-400 hover:text-blue-300 transition"
            >
              FAQ
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

// Main component that handles Clerk availability
export default function ExtensionPage() {
  const [clerkAvailable, setClerkAvailable] = useState(false);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    const hasClerkKey = !!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
    setClerkAvailable(hasClerkKey);
    setIsClient(true);
  }, []);

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

  // Render the main extension content
  return <ExtensionContent />;
}
