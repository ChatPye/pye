'use client';

import { useState, useEffect } from 'react';
import { useUser } from '@clerk/nextjs';
import Link from 'next/link';
import { ArrowLeft, Play, Clock, Eye, ExternalLink, Trash2 } from 'lucide-react';
import { extensionCommunication } from '@/lib/extension-communication';

interface WatchHistoryEntry {
  id: string;
  videoId: string;
  title: string;
  channelName: string;
  thumbnail: string;
  duration: number;
  watchedDuration: number;
  completionPercentage: number;
  lastWatchedAt: string;
  firstWatchedAt: string;
  watchCount: number;
  isCompleted: boolean;
  metadata: {
    source: string;
    videoUrl: string;
    lastPosition: number;
  };
}

function WatchHistoryContent() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [watchHistory, setWatchHistory] = useState<WatchHistoryEntry[]>([]);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [totalWatchTime, setTotalWatchTime] = useState(0);
  const [completedVideos, setCompletedVideos] = useState(0);
  const { user } = useUser();

  useEffect(() => {
    const fetchWatchHistory = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/watch-history?limit=20&offset=${page * 20}`);
        if (!response.ok) throw new Error('Failed to fetch watch history');
        
        const data = await response.json();
        const historyData = data.watchHistory || [];
        const combined = page === 0 ? historyData : [...watchHistory, ...historyData];
        setWatchHistory(combined);
        setHasMore(data.hasMore === true);
        
        // Calculate stats
        const totalTime = historyData.reduce((total: number, entry: WatchHistoryEntry) => 
          total + entry.watchedDuration, 0);
        const completed = historyData.filter((entry: WatchHistoryEntry) => entry.isCompleted).length;
        
        setTotalWatchTime(Math.floor(totalTime / 3600)); // Convert to hours
        setCompletedVideos(completed);
        
        // Sync watch history with extension
        try {
          await extensionCommunication.syncWatchHistory(historyData);
          console.log('✅ Watch history synced with extension');
        } catch (syncError) {
          console.warn('⚠️ Extension sync failed:', syncError);
        }
      } catch (err) {
        setError('Failed to load watch history');
        console.error('Error fetching watch history:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchWatchHistory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  const openVideoWithExtension = async (entry: WatchHistoryEntry) => {
    try {
      // Open the video URL
      window.open(entry.metadata.videoUrl, '_blank');
      
      // Try to communicate with extension to load chat history
      if (window.postMessage) {
        window.postMessage({
          type: 'CHATPYE_LOAD_VIDEO',
          data: {
            videoId: entry.videoId,
            startTime: entry.metadata.lastPosition,
            loadChatHistory: true
          },
          source: 'webapp'
        }, '*');
      }
    } catch (error) {
      console.error('Error opening video:', error);
      // Fallback: just open the video
      window.open(entry.metadata.videoUrl, '_blank');
    }
  };

  const deleteWatchHistoryEntry = async (entryId: string) => {
    if (!confirm('Are you sure you want to delete this watch history entry?')) {
      return;
    }

    try {
      const response = await fetch(`/api/watch-history?videoId=${entryId}`, {
        method: 'DELETE'
      });

      if (!response.ok) throw new Error('Failed to delete watch history entry');

      // Remove from local state
      setWatchHistory(prev => prev.filter(entry => entry.id !== entryId));
    } catch (error) {
      console.error('Error deleting watch history:', error);
      alert('Failed to delete watch history entry. Please try again.');
    }
  };

  const formatDuration = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    } else {
      return `${minutes}:${secs.toString().padStart(2, '0')}`;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p>Loading watch history...</p>
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
      <main className="p-8 max-w-6xl mx-auto">
        <div className="space-y-8">
          {/* Page Title */}
          <div className="text-center">
            <h1 className="text-4xl font-bold text-white mb-2">Watch History</h1>
            <p className="text-zinc-400">Your video watching journey with ChatPye</p>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl p-6 text-white shadow-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-100 text-sm font-medium">Total Videos</p>
                  <p className="text-3xl font-bold">{watchHistory.length}</p>
                </div>
                <Eye className="w-8 h-8 text-blue-300" />
              </div>
            </div>

            <div className="bg-gradient-to-br from-green-600 to-green-700 rounded-xl p-6 text-white shadow-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-green-100 text-sm font-medium">Completed</p>
                  <p className="text-3xl font-bold">{completedVideos}</p>
                </div>
                <div className="text-2xl">✅</div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-purple-600 to-purple-700 rounded-xl p-6 text-white shadow-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-purple-100 text-sm font-medium">Watch Time</p>
                  <p className="text-3xl font-bold">{totalWatchTime}h</p>
                </div>
                <Clock className="w-8 h-8 text-purple-300" />
              </div>
            </div>
          </div>

          {/* Watch History List */}
          {watchHistory.length === 0 ? (
            <div className="text-center py-16">
              <div className="w-24 h-24 bg-zinc-800 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-4xl">📺</span>
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">No watch history yet</h3>
              <p className="text-zinc-400 mb-6">Start watching videos to see your history here!</p>
              <Link
                href="/"
                className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg text-white font-medium transition-colors"
              >
                <Play className="w-5 h-5" />
                Watch Videos
              </Link>
            </div>
          ) : (
            <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-6">
              <h2 className="text-2xl font-bold text-white mb-6">Recent Videos</h2>
              
              <div className="space-y-4">
                {watchHistory
                  .sort((a, b) => new Date(b.lastWatchedAt).getTime() - new Date(a.lastWatchedAt).getTime())
                  .map((entry) => (
                    <div key={entry.id} className="bg-zinc-800 rounded-lg p-6 hover:bg-zinc-750 transition-colors">
                      <div className="flex items-start gap-4">
                        {/* Thumbnail */}
                        <div className="relative flex-shrink-0">
                          <img
                            src={entry.thumbnail || `https://img.youtube.com/vi/${entry.videoId}/hqdefault.jpg`}
                            alt={entry.title}
                            className="w-32 h-20 object-cover rounded-lg"
                          />
                          <div className="absolute bottom-1 right-1 bg-black/80 text-white text-xs px-1 rounded">
                            {formatDuration(entry.duration)}
                          </div>
                          {entry.isCompleted && (
                            <div className="absolute top-1 right-1 bg-green-600 text-white text-xs px-2 py-1 rounded">
                              ✓
                            </div>
                          )}
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <h3 className="text-lg font-semibold text-white mb-2 line-clamp-2">
                            {entry.title}
                          </h3>
                          <p className="text-zinc-400 text-sm mb-3">{entry.channelName}</p>
                          
                          {/* Progress Bar */}
                          <div className="mb-3">
                            <div className="flex items-center justify-between text-xs text-zinc-400 mb-1">
                              <span>Progress</span>
                              <span>{entry.completionPercentage.toFixed(0)}%</span>
                            </div>
                            <div className="w-full bg-zinc-700 rounded-full h-2">
                              <div
                                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                                style={{ width: `${Math.min(entry.completionPercentage, 100)}%` }}
                              ></div>
                            </div>
                          </div>

                          {/* Stats */}
                          <div className="flex items-center gap-4 text-xs text-zinc-400">
                            <span>Watched: {formatDuration(entry.watchedDuration)}</span>
                            <span>Views: {entry.watchCount}</span>
                            <span>Last: {new Date(entry.lastWatchedAt).toLocaleDateString()}</span>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex flex-col gap-2">
                          <button
                            onClick={() => openVideoWithExtension(entry)}
                            className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg text-white text-sm font-medium transition-colors"
                          >
                            <Play className="w-4 h-4" />
                            Continue
                          </button>
                          <a
                            href={entry.metadata.videoUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 px-4 py-2 bg-zinc-700 hover:bg-zinc-600 rounded-lg text-white text-sm font-medium transition-colors"
                          >
                            <ExternalLink className="w-4 h-4" />
                            Open
                          </a>
                          <button
                            onClick={() => deleteWatchHistoryEntry(entry.id)}
                            className="flex items-center gap-2 px-4 py-2 bg-red-600/20 hover:bg-red-600/30 text-red-400 hover:text-red-300 rounded-lg text-sm font-medium transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                            Remove
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                }
              </div>

              {/* Pagination */}
              <div className="mt-6 flex justify-center">
                {hasMore && (
                  <button
                    onClick={() => setPage(p => p + 1)}
                    className="px-4 py-2 rounded border border-zinc-700 text-zinc-200 hover:bg-zinc-900 disabled:opacity-50"
                    disabled={loading}
                  >
                    {loading ? 'Loading…' : 'Load more'}
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default function WatchHistoryPage() {
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

  return <WatchHistoryContent />;
}
