'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Copy, ExternalLink, Users, Eye, Calendar } from 'lucide-react';

interface SharedChat {
  shareId: string;
  title: string;
  messages: Array<{
    role: 'user' | 'assistant';
    content: string;
    timestamp: string;
  }>;
  viewCount: number;
  createdAt: string;
  metadata?: {
    videoTitle?: string;
    videoId?: string;
  };
}

export default function SharedChatPage() {
  const params = useParams();
  const shareId = params?.shareId as string;
  
  const [sharedChat, setSharedChat] = useState<SharedChat | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [copySuccess, setCopySuccess] = useState(false);

  useEffect(() => {
    const fetchSharedChat = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/shared/chat?id=${shareId}`);
        
        if (!response.ok) {
          if (response.status === 404) {
            setError('This chat is not available or has been made private.');
          } else {
            setError('Failed to load shared chat.');
          }
          return;
        }
        
        const data = await response.json();
        if (data.success) {
          setSharedChat(data);
        } else {
          setError('Failed to load shared chat.');
        }
      } catch (err) {
        console.error('Error fetching shared chat:', err);
        setError('Failed to load shared chat.');
      } finally {
        setLoading(false);
      }
    };

    if (shareId) {
      fetchSharedChat();
    }
  }, [shareId]);

  const copyShareLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p>Loading shared chat...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Chat Not Found</h1>
          <p className="text-zinc-400 mb-6">{error}</p>
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 transition"
          >
            Go Home
          </Link>
        </div>
      </div>
    );
  }

  if (!sharedChat) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Chat Not Found</h1>
          <p className="text-zinc-400 mb-6">This shared chat could not be loaded.</p>
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 transition"
          >
            Go Home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="max-w-4xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-3xl font-bold">{sharedChat.title}</h1>
            <button
              onClick={copyShareLink}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg border transition ${
                copySuccess
                  ? 'border-green-500 bg-green-500/10 text-green-400'
                  : 'border-zinc-700 bg-zinc-800 text-zinc-300 hover:border-zinc-600 hover:text-white'
              }`}
            >
              <Copy className="w-4 h-4" />
              {copySuccess ? 'Copied!' : 'Copy Link'}
            </button>
          </div>
          
          <div className="flex items-center gap-6 text-sm text-zinc-400">
            <div className="flex items-center gap-2">
              <Eye className="w-4 h-4" />
              <span>{sharedChat.viewCount} views</span>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              <span>Shared {formatDate(sharedChat.createdAt)}</span>
            </div>
            {sharedChat.metadata?.videoTitle && (
              <div className="flex items-center gap-2">
                <ExternalLink className="w-4 h-4" />
                <span>{sharedChat.metadata.videoTitle}</span>
              </div>
            )}
          </div>
        </div>

        {/* Chat Messages */}
        <div className="space-y-6">
          {sharedChat.messages.map((message, index) => (
            <div
              key={index}
              className={`flex gap-4 ${
                message.role === 'user' ? 'justify-end' : 'justify-start'
              }`}
            >
              <div
                className={`max-w-3xl px-6 py-4 rounded-2xl ${
                  message.role === 'user'
                    ? 'bg-blue-600 text-white'
                    : 'bg-zinc-800 text-zinc-100 border border-zinc-700'
                }`}
              >
                <div className="whitespace-pre-wrap">{message.content}</div>
                <div className="text-xs opacity-70 mt-2">
                  {new Date(message.timestamp).toLocaleTimeString()}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="mt-12 pt-8 border-t border-zinc-800 text-center">
          <p className="text-zinc-400 mb-4">
            This chat was shared from ChatPye - Transform your learning with AI
          </p>
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-6 py-3 text-white hover:bg-blue-700 transition"
          >
            Try ChatPye
            <ExternalLink className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}
