'use client';

import { useState, useEffect } from 'react';
import { useUser } from '@clerk/nextjs';
import Link from 'next/link';
import { ArrowLeft, Copy, Share2, Users, Gift, ExternalLink } from 'lucide-react';

interface ReferralData {
  referralCode: string;
  referralUrl: string;
  totalReferrals: number;
  completedReferrals: number;
  totalRewards: {
    credits: number;
    xp: number;
  };
}

// Wrapper component to handle Clerk availability
function ReferralsContent() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [referralData, setReferralData] = useState<ReferralData | null>(null);
  const [copySuccess, setCopySuccess] = useState(false);
  const { user } = useUser();

  useEffect(() => {
    const fetchReferralData = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/referrals?stats=true');
        if (!response.ok) throw new Error('Failed to fetch referral data');
        
        const data = await response.json();
        setReferralData({
          referralCode: data.referralCode || '',
          referralUrl: data.referralUrl || '',
          totalReferrals: data.stats?.totalReferrals || 0,
          completedReferrals: data.stats?.completedReferrals || 0,
          totalRewards: data.stats?.totalRewards || { credits: 0, xp: 0 }
        });
      } catch (err) {
        setError('Failed to load referral data');
        console.error('Error fetching referral data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchReferralData();
  }, []);

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const shareReferralLink = () => {
    if (navigator.share && referralData) {
      navigator.share({
        title: 'Join me on ChatPye!',
        text: 'Check out ChatPye - the AI-powered YouTube companion for learning and note-taking!',
        url: referralData.referralUrl
      });
    } else {
      copyToClipboard(referralData?.referralUrl || '');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p>Loading referral data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-400 mb-4">{error}</p>
          <Link href="/workspace" className="text-blue-400 hover:text-blue-300">
            ← Back to Workspace
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <header className="flex items-center justify-between p-6 border-b border-zinc-800">
        <div className="flex items-center gap-4">
          <Link href="/workspace" className="flex items-center gap-2 text-zinc-400 hover:text-white transition-colors">
            <ArrowLeft className="w-5 h-5" />
            Back to Workspace
          </Link>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-zinc-400">Welcome, {user?.firstName || 'User'}!</span>
        </div>
      </header>

      {/* Main Content */}
      <main className="p-8 max-w-4xl mx-auto">
        <div className="space-y-8">
          {/* Page Title */}
          <div className="text-center">
            <h1 className="text-4xl font-bold text-white mb-2">Referral Program</h1>
            <p className="text-zinc-400">Invite friends and earn rewards together!</p>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-gradient-to-br from-green-600 to-green-700 rounded-xl p-6 text-white shadow-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-green-100 text-sm font-medium">Total Referrals</p>
                  <p className="text-3xl font-bold">{referralData?.totalReferrals || 0}</p>
                </div>
                <Users className="w-8 h-8 text-green-300" />
              </div>
            </div>

            <div className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl p-6 text-white shadow-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-100 text-sm font-medium">Completed</p>
                  <p className="text-3xl font-bold">{referralData?.completedReferrals || 0}</p>
                </div>
                <Gift className="w-8 h-8 text-blue-300" />
              </div>
            </div>

            <div className="bg-gradient-to-br from-purple-600 to-purple-700 rounded-xl p-6 text-white shadow-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-purple-100 text-sm font-medium">Credits Earned</p>
                  <p className="text-3xl font-bold">{referralData?.totalRewards.credits || 0}</p>
                </div>
                <div className="text-2xl">⚡</div>
              </div>
            </div>
          </div>

          {/* Referral Link Section */}
          <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-8">
            <h2 className="text-2xl font-bold text-white mb-6">Your Referral Link</h2>
            
            <div className="space-y-6">
              {/* Referral Code */}
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">Referral Code</label>
                <div className="flex items-center gap-3">
                  <input
                    type="text"
                    value={referralData?.referralCode || ''}
                    readOnly
                    className="flex-1 px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-lg text-white font-mono text-lg"
                  />
                  <button
                    onClick={() => copyToClipboard(referralData?.referralCode || '')}
                    className="px-4 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
                  >
                    <Copy className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Referral URL */}
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">Referral URL</label>
                <div className="flex items-center gap-3">
                  <input
                    type="text"
                    value={referralData?.referralUrl || ''}
                    readOnly
                    className="flex-1 px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-sm"
                  />
                  <button
                    onClick={() => copyToClipboard(referralData?.referralUrl || '')}
                    className="px-4 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
                  >
                    <Copy className="w-5 h-5" />
                  </button>
                  <button
                    onClick={shareReferralLink}
                    className="px-4 py-3 bg-green-600 hover:bg-green-700 rounded-lg transition-colors"
                  >
                    <Share2 className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {copySuccess && (
                <div className="text-green-400 text-sm flex items-center gap-2">
                  ✓ Copied to clipboard!
                </div>
              )}
            </div>
          </div>

          {/* Rewards Info */}
          <div className="bg-gradient-to-br from-purple-900/30 to-blue-900/30 rounded-xl border border-purple-500/30 p-8">
            <h2 className="text-2xl font-bold text-white mb-6">How It Works</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div>
                <h3 className="text-lg font-semibold text-white mb-4">For You (Referrer)</h3>
                <ul className="space-y-3 text-zinc-300">
                  <li className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span>50 Credits when friend signs up</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span>100 XP points</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span>Unlimited referrals</span>
                  </li>
                </ul>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-white mb-4">For Your Friend</h3>
                <ul className="space-y-3 text-zinc-300">
                  <li className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    <span>25 Credits bonus</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    <span>50 XP points</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    <span>Full ChatPye access</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>

          {/* Share Buttons */}
          <div className="text-center">
            <h3 className="text-lg font-semibold text-white mb-4">Share ChatPye</h3>
            <div className="flex justify-center gap-4">
              <button
                onClick={shareReferralLink}
                className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 rounded-lg text-white font-medium transition-all duration-200 shadow-lg"
              >
                <Share2 className="w-5 h-5" />
                Share Link
              </button>
              <Link
                href="/pricing"
                className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 rounded-lg text-white font-medium transition-all duration-200 shadow-lg"
              >
                <ExternalLink className="w-5 h-5" />
                Upgrade to Pro
              </Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

// Main component that handles Clerk availability
export default function ReferralsPage() {
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
          <h2 className="text-xl font-semibold mb-2">Authentication Not Available</h2>
          <p className="text-gray-400">Please check your configuration.</p>
        </div>
      </div>
    );
  }

  return <ReferralsContent />;
}
