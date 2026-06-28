'use client';
import { useState, useEffect } from 'react';
import { useUser } from '@clerk/nextjs';
import { Bookmark, Clock, ExternalLink, Search, Calendar, Download, Trash2, Play, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { extensionCommunication } from '@/lib/extension-communication';

interface BookmarkData {
  id: string;
  videoId: string;
  title: string;
  description?: string;
  timestamp: number;
  thumbnailUrl?: string;
  createdAt: string;
  duration?: number;
}

interface BookmarksByMonth {
  [key: string]: BookmarkData[];
}

function BookmarksContent() {
  const { user, isLoaded } = useUser();
  const [bookmarks, setBookmarks] = useState<BookmarkData[]>([]);
  const [filteredBookmarks, setFilteredBookmarks] = useState<BookmarkData[]>([]);
  const [bookmarksByMonth, setBookmarksByMonth] = useState<BookmarksByMonth>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDate, setFilterDate] = useState<string>('');

  useEffect(() => {
    if (!isLoaded) return;

    const fetchBookmarks = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/extension/bookmarks', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          throw new Error('Failed to fetch bookmarks');
        }

        const data = await response.json();
        const bookmarksData = data.bookmarks || [];
        setBookmarks(bookmarksData);

        // Sync with extension
        if (bookmarksData.length > 0) {
          await extensionCommunication.syncBookmark(bookmarksData);
          console.log('✅ Bookmarks synced with extension');
        }
      } catch (err) {
        setError('Failed to load bookmarks');
        console.error('Error fetching bookmarks:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchBookmarks();
  }, [isLoaded]);

  useEffect(() => {
    let filtered = bookmarks;

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(bookmark => 
        bookmark.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        bookmark.description?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filter by date
    if (filterDate) {
      filtered = filtered.filter(bookmark => 
        bookmark.createdAt.startsWith(filterDate)
      );
    }

    setFilteredBookmarks(filtered);

    // Group by month
    const grouped = filtered.reduce((acc: BookmarksByMonth, bookmark: BookmarkData) => {
      const date = new Date(bookmark.createdAt);
      const monthKey = `${date.getFullYear()}-${date.getMonth()}`;
      const monthName = date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
      
      if (!acc[monthName]) {
        acc[monthName] = [];
      }
      acc[monthName].push(bookmark);
      return acc;
    }, {});

    setBookmarksByMonth(grouped);
  }, [bookmarks, searchTerm, filterDate]);

  const handleVisitVideo = (videoId: string, timestamp: number) => {
    const url = `https://www.youtube.com/watch?v=${videoId}&t=${Math.floor(timestamp)}s`;
    window.open(url, '_blank');
  };

  const formatTimestamp = (timestamp: number) => {
    const minutes = Math.floor(timestamp / 60);
    const seconds = Math.floor(timestamp % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-500 mx-auto mb-4"></div>
          <p className="text-lg">Loading bookmarks...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-500 text-lg">{error}</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <p className="text-lg">Please sign in to view your bookmarks.</p>
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
        {/* Page Title */}
        <div className="flex items-center gap-3 mb-8">
          <div className="p-2 bg-amber-500/20 rounded-lg">
            <Bookmark className="w-6 h-6 text-amber-500" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">My Bookmarks</h1>
            <p className="text-sm text-zinc-400">{bookmarks.length} bookmark{bookmarks.length !== 1 ? 's' : ''}</p>
          </div>
        </div>

        {/* Search and Filter Controls */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
            <input
              type="text"
              placeholder="Search bookmarks..."
              className="w-full pl-10 pr-4 py-3 rounded-xl bg-zinc-900/50 border border-zinc-700 text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
            <input
              type="month"
              className="pl-10 pr-4 py-3 rounded-xl bg-zinc-900/50 border border-zinc-700 text-white focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all"
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
            />
          </div>
        </div>

        {/* Bookmarks Content */}
        {Object.keys(bookmarksByMonth).length === 0 ? (
          <div className="text-center text-zinc-500 py-20">
            <div className="p-4 bg-amber-500/10 rounded-full w-16 h-16 mx-auto mb-6 flex items-center justify-center">
              <Bookmark className="w-8 h-8 text-amber-500" />
            </div>
            <h3 className="text-xl font-semibold mb-2">No bookmarks found</h3>
            <p className="text-sm">Start bookmarking videos using the ChatPye YouTube extension!</p>
          </div>
        ) : (
          <div className="space-y-8">
            {Object.entries(bookmarksByMonth).map(([monthYear, monthBookmarks]) => (
              <div key={monthYear}>
                <h2 className="text-xl font-semibold text-white mb-6 border-b border-zinc-800 pb-3 flex items-center gap-2">
                  <div className="w-2 h-2 bg-amber-500 rounded-full"></div>
                  {monthYear}
                  <span className="text-sm text-zinc-400 font-normal">({monthBookmarks.length} bookmark{monthBookmarks.length !== 1 ? 's' : ''})</span>
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {monthBookmarks.map((bookmark) => (
                    <div
                      key={bookmark.id}
                      className="group bg-gradient-to-br from-zinc-900 to-zinc-800 rounded-xl overflow-hidden border border-zinc-700 hover:border-amber-500/50 transition-all duration-300 hover:shadow-xl hover:shadow-amber-500/10"
                    >
                      <div className="relative">
                        <img
                          src={bookmark.thumbnailUrl || `https://img.youtube.com/vi/${bookmark.videoId}/mqdefault.jpg`}
                          alt={bookmark.title}
                          className="w-full h-48 object-cover transition-transform duration-300 group-hover:scale-105"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                        <div className="absolute top-3 left-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                          <div className="flex items-center gap-2 bg-black/70 backdrop-blur-sm rounded-lg px-3 py-1">
                            <Clock className="w-4 h-4 text-amber-400" />
                            <span className="text-sm font-medium text-white">{formatTimestamp(bookmark.timestamp)}</span>
                          </div>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleVisitVideo(bookmark.videoId, bookmark.timestamp);
                          }}
                          className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-y-2 group-hover:translate-y-0 bg-amber-500 hover:bg-amber-600 text-white p-2 rounded-lg shadow-lg"
                        >
                          <Play className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="p-4">
                        <h3 className="text-lg font-semibold text-white mb-2 line-clamp-2 group-hover:text-amber-400 transition-colors">
                          {bookmark.title}
                        </h3>
                        <p className="text-sm text-zinc-400 mb-3">
                          Bookmarked on {new Date(bookmark.createdAt).toLocaleDateString('en-US', { 
                            weekday: 'short', 
                            month: 'short', 
                            day: 'numeric' 
                          })}
                        </p>
                        <div className="flex items-center justify-between">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleVisitVideo(bookmark.videoId, bookmark.timestamp);
                            }}
                            className="inline-flex items-center gap-2 text-amber-500 hover:text-amber-400 transition-colors text-sm font-medium group-hover:gap-3 transition-all"
                          >
                            <ExternalLink className="w-4 h-4" />
                            Watch Video
                          </button>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                // TODO: Implement download functionality
                              }}
                              className="p-2 text-zinc-400 hover:text-white transition-colors"
                              title="Download"
                            >
                              <Download className="w-4 h-4" />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                // TODO: Implement delete functionality
                              }}
                              className="p-2 text-zinc-400 hover:text-red-400 transition-colors"
                              title="Delete"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

// Main component that handles Clerk availability
export default function BookmarksPage() {
  const [clerkAvailable, setClerkAvailable] = useState(false);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    const clerkKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
    const hasClerkKey = !!clerkKey;
    
    console.log('🔍 Bookmarks Clerk Check:', {
      hasClerkKey,
      clerkKeyPrefix: clerkKey?.substring(0, 10) + '...',
      isProduction: process.env.NODE_ENV === 'production',
      timestamp: new Date().toISOString()
    });
    
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

  // Render the main bookmarks content
  return <BookmarksContent />;
}