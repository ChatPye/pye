'use client'

import { useState, useEffect } from 'react'
import { useUser } from '@clerk/nextjs'
import { Copy, Share2, ExternalLink, Calendar, Clock } from 'lucide-react'

interface SharedItem {
  id: string
  content: string
  videoId: string
  type: 'response' | 'video'
  createdAt: string
  expiresAt: string
  shareUrl: string
}

export default function SharedPage() {
  const { user } = useUser()
  const [sharedItems, setSharedItems] = useState<SharedItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // In production, fetch from API
    // For now, show mock data
    setSharedItems([
      {
        id: 'share_1',
        content: 'This video covers React hooks in detail...',
        videoId: 'VID123',
        type: 'response',
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
        shareUrl: 'http://localhost:3000/shared/share_1'
      }
    ])
    setLoading(false)
  }, [])

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      // Show toast
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString()
  }

  const isExpired = (expiresAt: string) => {
    return new Date(expiresAt) < new Date()
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white p-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-2xl font-bold mb-8">Your Shared Items</h1>
          <div className="animate-pulse space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-zinc-800 rounded-lg p-4 h-24"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black text-white p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-bold">Your Shared Items</h1>
          <div className="text-sm text-zinc-400">
            {sharedItems.length} item{sharedItems.length !== 1 ? 's' : ''}
          </div>
        </div>

        {sharedItems.length === 0 ? (
          <div className="text-center py-12">
            <Share2 className="w-12 h-12 text-zinc-600 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-zinc-300 mb-2">No shared items yet</h3>
            <p className="text-zinc-500">Share AI responses or video pages to see them here.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {sharedItems.map((item) => (
              <div
                key={item.id}
                className={`bg-zinc-900 rounded-lg p-6 border ${
                  isExpired(item.expiresAt) 
                    ? 'border-red-500/30 bg-red-900/10' 
                    : 'border-zinc-700 hover:border-zinc-600'
                }`}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xs px-2 py-1 rounded-full bg-blue-500/20 text-blue-300">
                        {item.type === 'response' ? 'AI Response' : 'Video Page'}
                      </span>
                      {isExpired(item.expiresAt) && (
                        <span className="text-xs px-2 py-1 rounded-full bg-red-500/20 text-red-300">
                          Expired
                        </span>
                      )}
                    </div>
                    <p className="text-zinc-300 text-sm line-clamp-2 mb-3">
                      {item.content}
                    </p>
                    <div className="flex items-center gap-4 text-xs text-zinc-500">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {formatDate(item.createdAt)}
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        Expires {formatDate(item.expiresAt)}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => copyToClipboard(item.shareUrl)}
                    className="flex items-center gap-2 px-3 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-sm transition-colors"
                  >
                    <Copy className="w-4 h-4" />
                    Copy Link
                  </button>
                  <a
                    href={item.shareUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm transition-colors"
                  >
                    <ExternalLink className="w-4 h-4" />
                    Open
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}