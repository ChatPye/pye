'use client'

import { useState } from 'react'
import { Play, Clock, CheckCircle2, Circle } from 'lucide-react'

interface Chapter {
  id: string
  title: string
  startTime: number
  duration: number
  description?: string
  isWatched?: boolean
}

interface ChaptersListProps {
  chapters: Chapter[]
  currentTime: number
  onChapterClick: (startTime: number) => void
  className?: string
}

export default function ChaptersList({ 
  chapters, 
  currentTime, 
  onChapterClick,
  className = '' 
}: ChaptersListProps) {
  const [expandedChapter, setExpandedChapter] = useState<string | null>(null)

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const getCurrentChapter = () => {
    return chapters.find((chapter, index) => {
      const nextChapter = chapters[index + 1]
      return currentTime >= chapter.startTime && 
             (!nextChapter || currentTime < nextChapter.startTime)
    })
  }

  const currentChapter = getCurrentChapter()

  return (
    <div className={`space-y-4 ${className}`}>
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-white">Chapters</h3>
        <span className="text-sm text-gray-400">{chapters.length} chapters</span>
      </div>

      <div className="space-y-2">
        {chapters.map((chapter, index) => {
          const isActive = currentChapter?.id === chapter.id
          const isWatched = chapter.isWatched || false
          const isExpanded = expandedChapter === chapter.id

          return (
            <div
              key={chapter.id}
              className={`group rounded-xl border transition-all duration-200 ${
                isActive
                  ? 'border-blue-500/50 bg-blue-500/10'
                  : 'border-white/10 bg-white/[0.02] hover:border-white/20 hover:bg-white/[0.05]'
              }`}
            >
              <button
                onClick={() => onChapterClick(chapter.startTime)}
                className="w-full p-4 text-left"
              >
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 mt-1">
                    {isWatched ? (
                      <CheckCircle2 className="w-5 h-5 text-green-400" />
                    ) : (
                      <Circle className="w-5 h-5 text-gray-400" />
                    )}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-medium text-gray-400">
                        {index + 1}.
                      </span>
                      <h4 className={`font-medium truncate ${
                        isActive ? 'text-blue-400' : 'text-white'
                      }`}>
                        {chapter.title}
                      </h4>
                    </div>
                    
                    <div className="flex items-center gap-4 text-sm text-gray-400">
                      <div className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        <span>{formatTime(chapter.startTime)}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Play className="w-3 h-3" />
                        <span>{formatTime(chapter.duration)}</span>
                      </div>
                    </div>

                    {chapter.description && (
                      <p className="mt-2 text-sm text-gray-300 line-clamp-2">
                        {chapter.description}
                      </p>
                    )}
                  </div>

                  <div className="flex-shrink-0">
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        setExpandedChapter(isExpanded ? null : chapter.id)
                      }}
                      className="p-1 rounded-lg hover:bg-white/10 transition-colors"
                    >
                      <Play className={`w-4 h-4 text-gray-400 transition-transform ${
                        isExpanded ? 'rotate-90' : ''
                      }`} />
                    </button>
                  </div>
                </div>
              </button>

              {isExpanded && chapter.description && (
                <div className="px-4 pb-4 border-t border-white/10">
                  <p className="text-sm text-gray-300 leading-relaxed">
                    {chapter.description}
                  </p>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {chapters.length === 0 && (
        <div className="text-center py-8">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-800/50 flex items-center justify-center">
            <Play className="w-8 h-8 text-gray-400" />
          </div>
          <h4 className="text-lg font-medium text-white mb-2">No chapters available</h4>
          <p className="text-gray-400 text-sm">
            Chapters will be automatically generated when video processing completes.
          </p>
        </div>
      )}
    </div>
  )
}
