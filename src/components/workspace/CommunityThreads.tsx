'use client'

import { useState } from 'react'
import { 
  MessageSquare, 
  ThumbsUp, 
  Reply, 
  MoreHorizontal, 
  User, 
  Clock,
  Pin,
  Lock,
  Users,
  Hash
} from 'lucide-react'

interface Comment {
  id: string
  author: {
    name: string
    avatar?: string
    isVerified?: boolean
  }
  content: string
  timestamp: string
  likes: number
  replies: Comment[]
  isPinned?: boolean
  isLocked?: boolean
}

interface Thread {
  id: string
  title: string
  author: {
    name: string
    avatar?: string
    isVerified?: boolean
  }
  content: string
  timestamp: string
  likes: number
  replies: number
  views: number
  tags: string[]
  isPinned?: boolean
  isLocked?: boolean
  comments?: Comment[]
}

interface CommunityThreadsProps {
  threads: Thread[]
  onThreadClick: (thread: Thread) => void
  onLike: (threadId: string) => void
  onReply: (threadId: string, content: string) => void
  className?: string
}

export default function CommunityThreads({ 
  threads, 
  onThreadClick, 
  onLike, 
  onReply,
  className = '' 
}: CommunityThreadsProps) {
  const [sortBy, setSortBy] = useState<'recent' | 'popular' | 'pinned'>('recent')
  const [filter, setFilter] = useState<'all' | 'discussions' | 'questions' | 'announcements'>('all')
  const [replyContent, setReplyContent] = useState('')
  const [expandedThread, setExpandedThread] = useState<string | null>(null)

  const formatTimeAgo = (timestamp: string) => {
    const now = new Date()
    const time = new Date(timestamp)
    const diffInSeconds = Math.floor((now.getTime() - time.getTime()) / 1000)

    if (diffInSeconds < 60) return 'Just now'
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`
    return time.toLocaleDateString()
  }

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`
    return num.toString()
  }

  const sortedThreads = [...threads].sort((a, b) => {
    switch (sortBy) {
      case 'pinned':
        if (a.isPinned && !b.isPinned) return -1
        if (!a.isPinned && b.isPinned) return 1
        return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      case 'popular':
        return b.likes - a.likes
      case 'recent':
      default:
        return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    }
  })

  const filteredThreads = sortedThreads.filter(thread => {
    if (filter === 'all') return true
    return thread.tags.includes(filter.slice(0, -1)) // Remove 's' from filter
  })

  return (
    <div className={`space-y-4 ${className}`}>
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-white">Community</h3>
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-gray-400" />
          <span className="text-sm text-gray-400">{threads.length} threads</span>
        </div>
      </div>

      {/* Filters and Sort */}
      <div className="flex flex-col gap-3">
        {/* Sort Options */}
        <div className="flex gap-1 p-1 rounded-lg bg-gray-800/50">
          {[
            { key: 'recent', label: 'Recent' },
            { key: 'popular', label: 'Popular' },
            { key: 'pinned', label: 'Pinned' },
          ].map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setSortBy(key as any)}
              className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                sortBy === key
                  ? 'bg-white/10 text-white'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Category Filter */}
        <div className="flex gap-1 p-1 rounded-lg bg-gray-800/50">
          {[
            { key: 'all', label: 'All' },
            { key: 'discussions', label: 'Discussions' },
            { key: 'questions', label: 'Questions' },
            { key: 'announcements', label: 'Announcements' },
          ].map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setFilter(key as any)}
              className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                filter === key
                  ? 'bg-white/10 text-white'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Threads List */}
      <div className="space-y-3">
        {filteredThreads.map((thread) => (
          <div
            key={thread.id}
            className="group rounded-xl border border-white/10 bg-white/[0.02] hover:border-white/20 hover:bg-white/[0.05] transition-all duration-200 cursor-pointer"
            onClick={() => onThreadClick(thread)}
          >
            <div className="p-4">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white font-semibold text-sm">
                    {thread.author.name.charAt(0).toUpperCase()}
                  </div>
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between mb-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-medium text-white truncate group-hover:text-blue-400 transition-colors">
                          {thread.title}
                        </h4>
                        {thread.isPinned && (
                          <Pin className="w-4 h-4 text-yellow-400" />
                        )}
                        {thread.isLocked && (
                          <Lock className="w-4 h-4 text-gray-400" />
                        )}
                      </div>
                      
                      <div className="flex items-center gap-3 text-sm text-gray-400">
                        <div className="flex items-center gap-1">
                          <User className="w-3 h-3" />
                          <span>{thread.author.name}</span>
                          {thread.author.isVerified && (
                            <span className="text-blue-400">✓</span>
                          )}
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          <span>{formatTimeAgo(thread.timestamp)}</span>
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        onLike(thread.id)
                      }}
                      className="flex items-center gap-1 px-2 py-1 text-sm text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                    >
                      <ThumbsUp className="w-4 h-4" />
                      <span>{formatNumber(thread.likes)}</span>
                    </button>
                  </div>

                  <p className="text-gray-300 text-sm leading-relaxed line-clamp-2 mb-3">
                    {thread.content}
                  </p>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4 text-sm text-gray-400">
                      <div className="flex items-center gap-1">
                        <MessageSquare className="w-4 h-4" />
                        <span>{thread.replies} replies</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Users className="w-4 h-4" />
                        <span>{formatNumber(thread.views)} views</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {thread.tags.map((tag, index) => (
                        <span
                          key={index}
                          className="px-2 py-1 text-xs text-gray-400 bg-gray-800/50 rounded-full"
                        >
                          #{tag}
                        </span>
                      ))}
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          setExpandedThread(expandedThread === thread.id ? null : thread.id)
                        }}
                        className="flex items-center gap-1 px-2 py-1 text-sm text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                      >
                        <Reply className="w-4 h-4" />
                        <span>Reply</span>
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          // Handle pin
                        }}
                        className={`p-1 rounded-lg transition-colors ${
                          thread.isPinned 
                            ? 'text-yellow-400 hover:bg-yellow-400/10' 
                            : 'text-gray-400 hover:text-white hover:bg-white/10'
                        }`}
                      >
                        <Pin className="w-4 h-4" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          // Handle more options
                        }}
                        className="p-1 rounded-lg hover:bg-white/10 transition-colors"
                      >
                        <MoreHorizontal className="w-4 h-4 text-gray-400" />
                      </button>
                    </div>
                  </div>

                  {/* Reply Field */}
                  {expandedThread === thread.id && (
                    <div className="mt-4 pt-4 border-t border-white/10">
                      <div className="flex gap-3">
                        <div className="flex-shrink-0">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-400 to-blue-500 flex items-center justify-center text-white font-semibold text-sm">
                            U
                          </div>
                        </div>
                        <div className="flex-1">
                          <textarea
                            value={replyContent}
                            onChange={(e) => setReplyContent(e.target.value)}
                            placeholder="Write a reply..."
                            className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                            rows={3}
                            onClick={(e) => e.stopPropagation()}
                          />
                          <div className="flex items-center justify-end gap-2 mt-2">
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                setExpandedThread(null)
                                setReplyContent('')
                              }}
                              className="px-3 py-1.5 text-sm text-gray-400 hover:text-white transition-colors"
                            >
                              Cancel
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                if (replyContent.trim()) {
                                  onReply(thread.id, replyContent)
                                  setReplyContent('')
                                  setExpandedThread(null)
                                }
                              }}
                              disabled={!replyContent.trim()}
                              className="px-4 py-1.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:text-gray-400 disabled:cursor-not-allowed rounded-lg transition-colors"
                            >
                              Post Reply
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredThreads.length === 0 && (
        <div className="text-center py-8">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-800/50 flex items-center justify-center">
            <MessageSquare className="w-8 h-8 text-gray-400" />
          </div>
          <h4 className="text-lg font-medium text-white mb-2">No discussions yet</h4>
          <p className="text-gray-400 text-sm">
            Start a conversation about this video or ask questions to the community.
          </p>
        </div>
      )}
    </div>
  )
}
