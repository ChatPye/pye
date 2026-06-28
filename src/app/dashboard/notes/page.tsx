'use client';

import { useState, useEffect } from 'react';
import { useUser } from '@clerk/nextjs';
import Link from 'next/link';
import { ArrowLeft, Download, Calendar, Video, Search, Filter } from 'lucide-react';
import { extensionCommunication } from '@/lib/extension-communication';

interface Note {
  id: string;
  title: string;
  content: string;
  type: string;
  timestamp: number;
  createdAt: string;
  metadata: {
    videoTitle: string;
    videoChannel: string;
    videoThumbnail: string;
  };
}

interface NotesByMonth {
  [key: string]: Note[];
}

function NotesContent() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [notes, setNotes] = useState<Note[]>([]);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [filteredNotes, setFilteredNotes] = useState<Note[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState('all');
  const [notesByMonth, setNotesByMonth] = useState<NotesByMonth>({});
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const { user } = useUser();

  useEffect(() => {
    const fetchNotes = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/notes?limit=20&offset=${page * 20}`);
        if (!response.ok) throw new Error('Failed to fetch notes');
        
        const data = await response.json();
        const notesData = data.notes || [];
        const combined = page === 0 ? notesData : [...notes, ...notesData];
        setNotes(combined);
        setFilteredNotes(combined);
        setHasMore(data.hasMore === true);
        
        // Group notes by month
        const grouped = notesData.reduce((acc: NotesByMonth, note: Note) => {
          const date = new Date(note.createdAt);
          const monthKey = `${date.getFullYear()}-${date.getMonth()}`;
          const monthName = date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
          
          if (!acc[monthName]) {
            acc[monthName] = [];
          }
          acc[monthName].push(note);
          return acc;
        }, {});
        
        setNotesByMonth(grouped);
        
        // Sync notes with extension
        try {
          await extensionCommunication.syncNote(notesData);
          console.log('✅ Notes synced with extension');
        } catch (syncError) {
          console.warn('⚠️ Extension sync failed:', syncError);
        }
      } catch (err) {
        setError('Failed to load notes');
        console.error('Error fetching notes:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchNotes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  useEffect(() => {
    let filtered = notes;

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(note => 
        note.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        note.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
        note.metadata.videoTitle.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filter by type
    if (selectedType !== 'all') {
      filtered = filtered.filter(note => note.type === selectedType);
    }

    setFilteredNotes(filtered);
  }, [notes, searchTerm, selectedType]);

  const exportNoteAsPDF = async (note: Note) => {
    try {
      // Create a simple HTML content for PDF
      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>${note.title}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 40px; line-height: 1.6; }
            .header { border-bottom: 2px solid #333; padding-bottom: 20px; margin-bottom: 30px; }
            .title { font-size: 24px; font-weight: bold; color: #333; margin-bottom: 10px; }
            .meta { color: #666; font-size: 14px; }
            .content { white-space: pre-wrap; font-size: 16px; }
            .video-info { background: #f5f5f5; padding: 15px; border-radius: 5px; margin-bottom: 20px; }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="title">${note.title}</div>
            <div class="meta">
              Created: ${new Date(note.createdAt).toLocaleDateString()} | 
              Type: ${note.type} | 
              Video: ${note.metadata.videoTitle}
            </div>
          </div>
          
          <div class="video-info">
            <strong>Video:</strong> ${note.metadata.videoTitle}<br>
            <strong>Channel:</strong> ${note.metadata.videoChannel}<br>
            <strong>Timestamp:</strong> ${Math.floor(note.timestamp / 60)}:${(note.timestamp % 60).toString().padStart(2, '0')}
          </div>
          
          <div class="content">${note.content}</div>
        </body>
        </html>
      `;

      // Create a blob and download
      const blob = new Blob([htmlContent], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${note.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.html`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error exporting note:', error);
      alert('Failed to export note. Please try again.');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p>Loading notes...</p>
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
            <h1 className="text-4xl font-bold text-white mb-2">My Notes</h1>
            <p className="text-zinc-400">All your notes organized by month</p>
          </div>

          {/* Search and Filter */}
          <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-zinc-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Search notes..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-400 focus:outline-none focus:border-blue-500"
                />
              </div>
              <div className="flex items-center gap-2">
                <Filter className="text-zinc-400 w-5 h-5" />
                <select
                  value={selectedType}
                  onChange={(e) => setSelectedType(e.target.value)}
                  className="px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
                >
                  <option value="all">All Types</option>
                  <option value="user">User Notes</option>
                  <option value="ai-generated">AI Generated</option>
                  <option value="ocr">OCR</option>
                  <option value="bookmark">Bookmarks</option>
                </select>
              </div>
            </div>
          </div>

          {/* Notes Content */}
          {filteredNotes.length === 0 ? (
            <div className="text-center py-16">
              <div className="w-24 h-24 bg-zinc-800 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-4xl">📝</span>
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">No notes found</h3>
              <p className="text-zinc-400 mb-6">
                {searchTerm || selectedType !== 'all' 
                  ? 'Try adjusting your search or filter criteria.'
                  : 'Start taking notes on videos to see them here!'
                }
              </p>
              {(!searchTerm && selectedType === 'all') && (
                <Link
                  href="/"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg text-white font-medium transition-colors"
                >
                  <Video className="w-5 h-5" />
                  Watch Videos
                </Link>
              )}
            </div>
          ) : (
            <div className="space-y-8">
              {Object.entries(notesByMonth)
                .filter(([month]) => {
                  const monthNotes = notesByMonth[month];
                  return monthNotes.some(note => filteredNotes.includes(note));
                })
                .sort(([a], [b]) => new Date(b).getTime() - new Date(a).getTime())
                .map(([month, monthNotes]) => (
                  <div key={month} className="bg-zinc-900 rounded-xl border border-zinc-800 p-6">
                    <div className="flex items-center gap-3 mb-6">
                      <Calendar className="text-blue-400 w-6 h-6" />
                      <h2 className="text-2xl font-bold text-white">{month}</h2>
                      <span className="text-zinc-400">
                        ({monthNotes.filter(note => filteredNotes.includes(note)).length} notes)
                      </span>
                    </div>
                    
                    <div className="space-y-4">
                      {monthNotes
                        .filter(note => filteredNotes.includes(note))
                        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                        .map((note) => (
                          <div key={note.id} className="bg-zinc-800 rounded-lg p-6 hover:bg-zinc-750 transition-colors">
                            <div className="flex items-start justify-between mb-4">
                              <div className="flex-1">
                                <h3 className="text-lg font-semibold text-white mb-2">{note.title}</h3>
                                <div className="flex items-center gap-4 text-sm text-zinc-400 mb-3">
                                  <span className="flex items-center gap-1">
                                    <Video className="w-4 h-4" />
                                    {note.metadata.videoTitle}
                                  </span>
                                  <span>{new Date(note.createdAt).toLocaleDateString()}</span>
                                  <span className="px-2 py-1 bg-zinc-700 rounded text-xs">
                                    {note.type}
                                  </span>
                                </div>
                              </div>
                              <button
                                onClick={() => exportNoteAsPDF(note)}
                                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-white text-sm font-medium transition-colors"
                              >
                                <Download className="w-4 h-4" />
                                Export
                              </button>
                            </div>
                            
                            <div className="text-zinc-300 leading-relaxed">
                              {note.content.length > 200 ? (
                                <>
                                  {note.content.substring(0, 200)}...
                                  <button
                                    onClick={() => setSelectedNote(note)}
                                    className="text-blue-400 hover:text-blue-300 ml-2"
                                  >
                                    Read more
                                  </button>
                                </>
                              ) : (
                                note.content
                              )}
                            </div>
                          </div>
                        ))
                      }
                    </div>
                  </div>
                ))
              }
            </div>
          )}

          {/* Pagination */}
          <div className="mt-8 flex justify-center">
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
      </main>

      {/* Note Detail Modal */}
      {selectedNote && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
          <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-8 max-w-4xl w-full max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-white">{selectedNote.title}</h2>
              <button
                onClick={() => setSelectedNote(null)}
                className="text-zinc-400 hover:text-white text-2xl"
              >
                ×
              </button>
            </div>
            
            <div className="space-y-4 mb-6">
              <div className="flex items-center gap-4 text-sm text-zinc-400">
                <span className="flex items-center gap-1">
                  <Video className="w-4 h-4" />
                  {selectedNote.metadata.videoTitle}
                </span>
                <span>{new Date(selectedNote.createdAt).toLocaleDateString()}</span>
                <span className="px-2 py-1 bg-zinc-700 rounded text-xs">
                  {selectedNote.type}
                </span>
              </div>
              
              <div className="text-zinc-300 leading-relaxed whitespace-pre-wrap">
                {selectedNote.content}
              </div>
            </div>
            
            <div className="flex justify-end">
              <button
                onClick={() => exportNoteAsPDF(selectedNote)}
                className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg text-white font-medium transition-colors"
              >
                <Download className="w-5 h-5" />
                Export as HTML
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function NotesPage() {
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

  return <NotesContent />;
}
