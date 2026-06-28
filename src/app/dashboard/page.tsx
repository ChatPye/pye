'use client';

import { useState, useEffect, useMemo, useCallback, Suspense } from 'react';
import { useUser, useClerk } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowRight, LogOut, Crown } from 'lucide-react';
import { DashboardSidebar } from '@/components/DashboardSidebar';
import { extensionCommunication } from '@/lib/extension-communication';
import { DashboardSecurity } from '@/components/DashboardSecurity';
import { DashboardExtensionIntegration } from '@/components/DashboardExtensionIntegration';

// Lazy load heavy components
import dynamicImport from 'next/dynamic';


// Force dynamic rendering to avoid SSR issues with Clerk
export const dynamic = 'force-dynamic';

interface UserData {
  userClass: {
    class: 'freemium' | 'pro';
    subscriptionStatus: {
      isActive: boolean;
      planType: string | null;
      startDate: string | null;
      endDate: string | null;
    };
    usageStats: {
      videosProcessed: number;
      questionsAsked: number;
      notesCreated: number;
      bookmarksCreated: number;
      lastActivity: string;
    };
    preferences: {
      showUpgradePrompts: boolean;
      emailNotifications: boolean;
      marketingEmails: boolean;
    };
    showUpgradePrompts: boolean;
    limits: {
      videosPerMonth: number;
      questionsPerMonth: number;
      notesPerMonth: number;
      bookmarksPerMonth: number;
    };
  };
  credits: {
    current: number;
    totalAllocated: number;
    tier: string;
    tierName: string;
    resetDate: string;
  };
  xp: {
    total: number;
    level: number;
    nextLevelAt: number;
    badges: string[];
    streak: number;
  };
  referral: {
    code: string;
    referrals: number;
    totalRewards: number;
  };
}

interface Note {
  id: string;
  videoId: string;
  videoTitle: string;
  content: string;
  timestamp: number;
  createdAt: string;
}

interface WatchHistory {
  id: string;
  videoId: string;
  videoTitle: string;
  videoChannel: string;
  progress: number;
  lastWatchedAt: string;
}

// Wrapper component to handle Clerk availability
function DashboardContent() {
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'activity' | 'referrals' | 'settings'>('overview');
  const [copyToast, setCopyToast] = useState<string | null>(null);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  
  // Real data state
  const [dashboardData, setDashboardData] = useState({
    credits: { balance: 0, subscriptionTier: 'free' },
    xp: { totalXP: 0, level: 1, currentLevelXP: 0, nextLevelXP: 100 },
    referrals: { totalReferrals: 0, completedReferrals: 0, referralCode: '', referralUrl: '' },
    watchTime: 0,
    recentNotes: [],
    recentWatchHistory: []
  });
  
  const { user, isLoaded } = useUser();
  const { signOut } = useClerk();
  const router = useRouter();

  // Optimized dashboard data fetching with caching
  const fetchDashboardData = useCallback(async () => {
    if (!user?.id) return;
    
    try {
      // Check cache first
      const cacheKey = `dashboard_data_${user.id}`;
      const cached = sessionStorage.getItem(cacheKey);
      if (cached) {
        const { data, timestamp } = JSON.parse(cached);
        // Use cache if less than 5 minutes old
        if (Date.now() - timestamp < 300000) {
          setDashboardData(data);
          return;
        }
      }

      const startTime = Date.now();
      const [creditsRes, xpRes, referralsRes, notesRes, watchHistoryRes] = await Promise.all([
        fetch('/api/credits'),
        fetch('/api/xp'),
        fetch('/api/referrals?stats=true'),
        fetch('/api/notes?limit=3'),
        fetch('/api/watch-history?limit=3')
      ]);

      const [creditsData, xpData, referralsData, notesData, watchHistoryData] = await Promise.all([
        creditsRes.json(),
        xpRes.json(),
        referralsRes.json(),
        notesRes.json(),
        watchHistoryRes.json()
      ]);

      // Calculate total watch time
      const totalWatchTime = watchHistoryData.watchHistory?.reduce((total: number, entry: any) => 
        total + (entry.watchedDuration || 0), 0) || 0;

      const dashboardData = {
        credits: creditsData.credits || { balance: 100, subscriptionTier: 'free' },
        xp: xpData.xp || { totalXP: 0, level: 1, currentLevelXP: 0, nextLevelXP: 100 },
        referrals: {
          totalReferrals: referralsData.stats?.totalReferrals || 0,
          completedReferrals: referralsData.stats?.completedReferrals || 0,
          referralCode: referralsData.referralCode || '',
          referralUrl: referralsData.referralUrl || ''
        },
        watchTime: Math.floor(totalWatchTime / 3600), // Convert to hours
        recentNotes: notesData.notes || [],
        recentWatchHistory: watchHistoryData.watchHistory || []
      };

      setDashboardData(dashboardData);
      
      // Cache the data
      sessionStorage.setItem(cacheKey, JSON.stringify({
        data: dashboardData,
        timestamp: Date.now()
      }));
      
      const duration = Date.now() - startTime;
      console.log(`Dashboard data fetched in ${duration}ms`);

      // Sync data with extension for three-way communication
      try {
        await extensionCommunication.syncDashboardData(dashboardData);
        console.log('✅ Dashboard data synced with extension');
      } catch (syncError) {
        console.warn('⚠️ Extension sync failed:', syncError);
        // Don't fail the whole operation if extension sync fails
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    }
  }, [user?.id]);

  // Process referral code if present
  const processReferralCode = async () => {
    const storedReferralCode = localStorage.getItem('chatpye_referral_code');
    if (storedReferralCode && user?.id) {
      try {
        const response = await fetch('/api/referrals', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            action: 'use_referral_code',
            referralCode: storedReferralCode
          })
        });

        if (response.ok) {
          const result = await response.json();
          if (result.success) {
            console.log('✅ Referral processed successfully:', result.message);
            // Clear the stored referral code
            localStorage.removeItem('chatpye_referral_code');
          }
        }
      } catch (error) {
        console.error('Error processing referral code:', error);
      }
    }
  };

  // Optimized loading state - only show spinner for essential loading
  useEffect(() => {
    if (isLoaded && user) {
      setLoading(false);
      // Defer fetch to next tick to avoid blocking initial render
      setTimeout(() => {
        fetchDashboardData();
        processReferralCode(); // Process any pending referral code
      }, 0);
    }
  }, [isLoaded, user]);

  // Show loading state only while Clerk is initializing
  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p>Loading dashboard...</p>
        </div>
      </div>
    );
  }

  // Redirect to sign-in if no user (Clerk will handle this automatically)
  if (!user) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <p>Redirecting to sign in…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between p-4 border-b border-zinc-800">
        <Link href="/workspace" className="text-2xl font-bold text-white">
          ChatPye
        </Link>
        <div className="flex items-center gap-4">
          <span className="text-zinc-400">Welcome, {user.firstName || 'User'}!</span>
          <button
            onClick={() => signOut()}
            className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 rounded-md text-white font-medium transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex flex-1">
        <DashboardSidebar activeTab={activeTab as any} onSelectTab={(t) => setActiveTab(t as any)} />

        {/* Content Area */}
        <main className="flex-1 p-8 overflow-y-auto">
          <div className="space-y-8">
            {/* Enhanced Header */}
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-blue-600/10 via-purple-600/10 to-emerald-600/10 rounded-2xl blur-xl"></div>
              <div className="relative bg-gradient-to-r from-zinc-900/80 to-zinc-800/80 backdrop-blur-sm rounded-2xl p-6 border border-zinc-700/50">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-4xl font-bold bg-gradient-to-r from-blue-400 via-purple-400 to-emerald-400 bg-clip-text text-transparent">
                      Dashboard
                    </h2>
                    <p className="text-zinc-300 mt-2 text-lg">Welcome back, <span className="font-semibold text-white">{user.firstName || 'User'}</span>!</p>
                    <div className="flex items-center gap-4 mt-3">
                      <div className="flex items-center gap-2 text-sm text-zinc-400">
                        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                        <span>All systems operational</span>
                      </div>
                      <div className="w-px h-4 bg-zinc-600"></div>
                      <div className="text-sm text-zinc-400">
                        Last active: {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/25">
                      <span className="text-2xl">🚀</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {activeTab === 'overview' && (
              <>
                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  {/* Credits Card */}
                  <div className="group relative overflow-hidden bg-gradient-to-br from-blue-500 via-blue-600 to-blue-700 rounded-2xl p-6 text-white transform transition-all duration-300 hover:scale-105 hover:shadow-2xl hover:shadow-blue-500/25">
                    <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                    <div className="relative flex items-center justify-between">
                      <div>
                        <p className="text-blue-100 text-sm font-medium mb-1">Credits</p>
                        <p className="text-4xl font-bold tracking-tight">{dashboardData.credits.balance}</p>
                        <p className="text-blue-200 text-xs mt-1">{dashboardData.credits.subscriptionTier === 'pro' ? 'Pro Plan' : 'Free Plan'}</p>
                      </div>
                      <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center transform transition-transform duration-300 group-hover:scale-110 group-hover:rotate-12">
                        <span className="text-3xl">⚡</span>
                      </div>
                    </div>
                    <div className="absolute -top-4 -right-4 w-24 h-24 bg-white/5 rounded-full blur-xl"></div>
                  </div>

                  {/* Referrals Card */}
                  <div className="group relative overflow-hidden bg-gradient-to-br from-emerald-500 via-emerald-600 to-green-700 rounded-2xl p-6 text-white transform transition-all duration-300 hover:scale-105 hover:shadow-2xl hover:shadow-emerald-500/25">
                    <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                    <div className="relative flex items-center justify-between">
                      <div>
                        <p className="text-emerald-100 text-sm font-medium mb-1">Referrals</p>
                        <p className="text-4xl font-bold tracking-tight">{dashboardData.referrals.completedReferrals}</p>
                        <p className="text-emerald-200 text-xs mt-1">{dashboardData.referrals.totalReferrals} total</p>
                      </div>
                      <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center transform transition-transform duration-300 group-hover:scale-110 group-hover:rotate-12">
                        <span className="text-3xl">👥</span>
                      </div>
                    </div>
                    <div className="absolute -top-4 -right-4 w-24 h-24 bg-white/5 rounded-full blur-xl"></div>
                  </div>

                  {/* XP Card */}
                  <div className="group relative overflow-hidden bg-gradient-to-br from-purple-500 via-violet-600 to-purple-700 rounded-2xl p-6 text-white transform transition-all duration-300 hover:scale-105 hover:shadow-2xl hover:shadow-purple-500/25">
                    <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                    <div className="relative flex items-center justify-between">
                      <div>
                        <p className="text-purple-100 text-sm font-medium mb-1">XP Points</p>
                        <p className="text-4xl font-bold tracking-tight">{dashboardData.xp.totalXP.toLocaleString()}</p>
                        <p className="text-purple-200 text-xs mt-1">Level {dashboardData.xp.level}</p>
                      </div>
                      <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center transform transition-transform duration-300 group-hover:scale-110 group-hover:rotate-12">
                        <span className="text-3xl">⭐</span>
                      </div>
                    </div>
                    <div className="absolute -top-4 -right-4 w-24 h-24 bg-white/5 rounded-full blur-xl"></div>
                  </div>

                  {/* Watch Time Card */}
                  <div className="group relative overflow-hidden bg-gradient-to-br from-amber-500 via-orange-600 to-red-600 rounded-2xl p-6 text-white transform transition-all duration-300 hover:scale-105 hover:shadow-2xl hover:shadow-amber-500/25">
                    <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                    <div className="relative flex items-center justify-between">
                      <div>
                        <p className="text-amber-100 text-sm font-medium mb-1">Watch Time</p>
                        <p className="text-4xl font-bold tracking-tight">{dashboardData.watchTime}h</p>
                        <p className="text-amber-200 text-xs mt-1">Total watched</p>
                      </div>
                      <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center transform transition-transform duration-300 group-hover:scale-110 group-hover:rotate-12">
                        <span className="text-3xl">📺</span>
                      </div>
                    </div>
                    <div className="absolute -top-4 -right-4 w-24 h-24 bg-white/5 rounded-full blur-xl"></div>
                  </div>
                </div>

                {/* Recent Activity Cards */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Notes Card */}
                  <div className="group relative overflow-hidden bg-gradient-to-br from-zinc-900 to-zinc-800 rounded-2xl border border-zinc-700/50 p-6 hover:border-purple-500/50 transition-all duration-300 hover:shadow-xl hover:shadow-purple-500/10">
                    <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                    <div className="relative flex items-center justify-between mb-6">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-violet-600 rounded-xl flex items-center justify-center">
                          <span className="text-xl">📝</span>
                        </div>
                        <h3 className="text-xl font-semibold text-white">Recent Notes</h3>
                      </div>
              <Link href="/dashboard/notes" className="text-purple-400 hover:text-purple-300 text-sm font-medium transition-colors duration-200 hover:gap-2 flex items-center gap-1">
                        View all
                        <ArrowRight className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-1" />
                      </Link>
                    </div>
                    <div className="space-y-4">
                      {dashboardData.recentNotes.length > 0 ? (
                        dashboardData.recentNotes.map((note: any, index: number) => (
                          <div key={note.id} className="group/item p-4 bg-zinc-800/50 rounded-xl border border-zinc-700/30 hover:border-purple-500/30 hover:bg-zinc-800/70 transition-all duration-200">
                            <div className="flex items-start gap-3">
                              <div className={`w-3 h-3 rounded-full mt-2 ${
                                index === 0 ? 'bg-purple-500' : 
                                index === 1 ? 'bg-blue-500' : 'bg-green-500'
                              }`}></div>
                              <div className="flex-1">
                                <p className="text-zinc-200 text-sm font-medium line-clamp-1 group-hover/item:text-white transition-colors">{note.title}</p>
                                <p className="text-zinc-500 text-xs mt-2 flex items-center gap-2">
                                  <span>📺</span>
                                  Created {new Date(note.createdAt).toLocaleDateString()}
                                </p>
                              </div>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="text-center py-8">
                          <div className="w-12 h-12 bg-purple-500/20 rounded-xl mx-auto mb-3 flex items-center justify-center">
                            <span className="text-2xl">📝</span>
                          </div>
                          <p className="text-zinc-500 text-sm">No notes yet</p>
                          <p className="text-zinc-600 text-xs mt-1">Start taking notes with the extension!</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Watch History Card */}
                  <div className="group relative overflow-hidden bg-gradient-to-br from-zinc-900 to-zinc-800 rounded-2xl border border-zinc-700/50 p-6 hover:border-amber-500/50 transition-all duration-300 hover:shadow-xl hover:shadow-amber-500/10">
                    <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                    <div className="relative flex items-center justify-between mb-6">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl flex items-center justify-center">
                          <span className="text-xl">📺</span>
                        </div>
                        <h3 className="text-xl font-semibold text-white">Watch History</h3>
                      </div>
                      <Link href="/dashboard/watch" className="text-amber-400 hover:text-amber-300 text-sm font-medium transition-colors duration-200 hover:gap-2 flex items-center gap-1">
                        View all
                        <ArrowRight className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-1" />
                      </Link>
                    </div>
                    <div className="space-y-4">
                      {dashboardData.recentWatchHistory.length > 0 ? (
                        dashboardData.recentWatchHistory.map((entry: any, index: number) => (
                          <div key={entry.id} className="group/item p-4 bg-zinc-800/50 rounded-xl border border-zinc-700/30 hover:border-amber-500/30 hover:bg-zinc-800/70 transition-all duration-200">
                            <div className="flex items-start gap-3">
                              <div className="w-12 h-8 bg-gradient-to-r from-red-500 to-red-600 rounded-lg flex items-center justify-center text-white text-xs font-bold shadow-lg">
                                YT
                              </div>
                              <div className="flex-1">
                                <p className="text-zinc-200 text-sm font-medium line-clamp-1 group-hover/item:text-white transition-colors">{entry.title}</p>
                                <p className="text-zinc-500 text-xs mt-2 flex items-center gap-2">
                                  <span>🕐</span>
                                  Watched {new Date(entry.lastWatchedAt).toLocaleDateString()}
                                </p>
                              </div>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="text-center py-8">
                          <div className="w-12 h-12 bg-amber-500/20 rounded-xl mx-auto mb-3 flex items-center justify-center">
                            <span className="text-2xl">📺</span>
                          </div>
                          <p className="text-zinc-500 text-sm">No watch history yet</p>
                          <p className="text-zinc-600 text-xs mt-1">Watch videos with the extension!</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </>
            )}

            {activeTab === 'settings' && (
              <div className="space-y-6">
                {/* Security Section */}
                <DashboardSecurity 
                  userId={user?.id}
                  enableRealTimeMonitoring={true}
                />
                
                {/* Extension Status */}
                <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-6">
                  <h3 className="text-lg font-semibold mb-4">Extension Status</h3>
                  <DashboardExtensionIntegration />
                </div>
                
                {/* Account Settings */}
                <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-6">
                  <h3 className="text-lg font-semibold mb-4">Account Settings</h3>
                  <p className="text-zinc-400 text-sm mb-4">Manage your account preferences and privacy settings.</p>
                  <div>
                    <h4 className="text-white font-medium mb-2">Notifications</h4>
                    <p className="text-zinc-400 text-sm">Configure how you receive notifications from ChatPye.</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

// Main component that handles Clerk availability
export default function UserDashboard() {
  // Render the main dashboard content directly - Clerk will handle its own loading states
  return <DashboardContent />;
}

