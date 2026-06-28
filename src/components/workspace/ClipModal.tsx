'use client'

import { useState, useEffect } from 'react'
import { X, Play, Pause, Scissors } from 'lucide-react'

interface ClipModalProps {
  isOpen: boolean
  onClose: () => void
  currentTime: number
  videoDuration: number
  onCreateClip: (start: number, duration: number, notes?: string) => Promise<void>
}

function formatTimestamp(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
}

export default function ClipModal({
  isOpen,
  onClose,
  currentTime,
  videoDuration,
  onCreateClip
}: ClipModalProps) {
  const [startTime, setStartTime] = useState(currentTime)
  const [endTime, setEndTime] = useState(Math.min(currentTime + 30, videoDuration || currentTime + 30))
  const [notes, setNotes] = useState('')
  const [isCreating, setIsCreating] = useState(false)

  useEffect(() => {
    if (isOpen) {
      setStartTime(Math.floor(currentTime))
      setEndTime(Math.min(Math.floor(currentTime) + 30, Math.floor(videoDuration) || Math.floor(currentTime) + 30))
    }
  }, [isOpen, currentTime, videoDuration])

  if (!isOpen) return null

  const duration = Math.max(0, Math.floor(endTime) - Math.floor(startTime))
  const maxDuration = videoDuration ? Math.floor(videoDuration) : 3600

  const handleCreate = async () => {
    if (duration <= 0) {
      alert('Clip duration must be greater than 0')
      return
    }
    if (duration > maxDuration) {
      alert(`Clip duration cannot exceed video duration`)
      return
    }

    setIsCreating(true)
    try {
      await onCreateClip(Math.floor(startTime), duration, notes.trim() || undefined)
      onClose()
      setNotes('')
    } catch (error) {
      console.error('Failed to create clip:', error)
      alert('Failed to create clip')
    } finally {
      setIsCreating(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
      <div className="relative w-full max-w-md bg-zinc-900 border border-zinc-700 rounded-lg p-6 shadow-2xl">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-zinc-400 hover:text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <Scissors className="w-5 h-5" />
          Create Clip
        </h2>

        <div className="space-y-4">
          {/* Start Time */}
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-2">
              Start Time
            </label>
            <div className="flex items-center gap-2">
              <input
                type="range"
                min={0}
                max={maxDuration}
                value={startTime}
                onChange={(e) => {
                  const newStart = parseInt(e.target.value)
                  setStartTime(newStart)
                  if (newStart >= endTime) {
                    setEndTime(Math.min(newStart + 1, maxDuration))
                  }
                }}
                className="flex-1"
              />
              <span className="text-sm text-zinc-400 w-16 text-right">
                {formatTimestamp(startTime)}
              </span>
            </div>
          </div>

          {/* End Time */}
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-2">
              End Time
            </label>
            <div className="flex items-center gap-2">
              <input
                type="range"
                min={startTime}
                max={maxDuration}
                value={endTime}
                onChange={(e) => setEndTime(parseInt(e.target.value))}
                className="flex-1"
              />
              <span className="text-sm text-zinc-400 w-16 text-right">
                {formatTimestamp(endTime)}
              </span>
            </div>
          </div>

          {/* Duration Display */}
          <div className="bg-zinc-800 rounded p-3">
            <div className="text-sm text-zinc-400">Duration</div>
            <div className="text-lg font-semibold">{formatTimestamp(duration)}</div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-2">
              Notes (optional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add notes about this clip..."
              className="w-full bg-zinc-800 border border-zinc-700 rounded px-3 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500"
              rows={3}
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded transition-colors"
              disabled={isCreating}
            >
              Cancel
            </button>
            <button
              onClick={handleCreate}
              disabled={isCreating || duration <= 0}
              className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isCreating ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Scissors className="w-4 h-4" />
                  Create Clip
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

