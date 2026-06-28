'use client'

import { useState } from 'react'
import { 
  ThumbsUp, 
  Tag
} from 'lucide-react'

interface VideoDetailsProps {
  videoId: string
  title: string
  channel: string
  description: string
  duration: number
  views?: number
  likes?: number
  publishedAt: string
  thumbnail: string
  tags?: string[]
  className?: string
}

export default function VideoDetails({
  videoId,
  title,
  channel,
  description,
  duration,
  views,
  likes,
  publishedAt,
  thumbnail,
  tags = [],
  className = ''
}: VideoDetailsProps) {
  const [showFullDescription, setShowFullDescription] = useState(false)

  const formatViews = (num: number) => {
    if (num >= 1000000) {
      return `${(num / 1000000).toFixed(1)}M`
    }
    if (num >= 1000) {
      return `${(num / 1000).toFixed(1)}K`
    }
    return num.toString()
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Video Title */}
      <div className="space-y-4">
        <h1 className="text-2xl font-bold text-white leading-tight">{title}</h1>
      </div>

      {/* Channel Info */}
      <div className="flex items-start gap-4 p-4 rounded-xl border border-white/10 bg-white/[0.02]">
        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white font-semibold">
          {channel.charAt(0).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-white">{channel}</h3>
            <button className="px-3 py-1 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-full transition-colors">
              Follow
            </button>
          </div>
          <p className="text-sm text-gray-400 mt-1">Educational Content Creator</p>
        </div>
        <div className="flex items-center gap-2">
          {likes && (
            <div className="flex items-center gap-1 text-sm text-gray-400">
              <ThumbsUp className="w-4 h-4" />
              <span>{formatViews(likes)}</span>
            </div>
          )}
        </div>
      </div>

      {/* Description */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold text-white">Description</h3>
        </div>
        <div className="text-gray-300 leading-relaxed">
          {showFullDescription ? (
            <p>{description}</p>
          ) : (
            <p>
              {description.length > 200 
                ? `${description.substring(0, 200)}...` 
                : description
              }
            </p>
          )}
          {description.length > 200 && (
            <button
              onClick={() => setShowFullDescription(!showFullDescription)}
              className="text-blue-400 hover:text-blue-300 font-medium mt-2 transition-colors"
            >
              {showFullDescription ? 'Show less' : 'Show more'}
            </button>
          )}
        </div>
      </div>

      {/* Tags */}
      {tags.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Tag className="w-4 h-4 text-gray-400" />
            <h3 className="font-semibold text-white">Tags</h3>
          </div>
          <div className="flex flex-wrap gap-2">
            {tags.map((tag, index) => (
              <span
                key={index}
                className="px-3 py-1 text-sm text-gray-300 bg-gray-800/50 rounded-full border border-white/10 hover:bg-gray-700/50 transition-colors cursor-pointer"
              >
                #{tag}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
