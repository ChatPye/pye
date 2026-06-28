'use client'

import { useState, useRef, useEffect } from 'react'
import { X, Copy, Check } from 'lucide-react'

interface SnipOverlayProps {
  isActive: boolean
  onClose: () => void
  onSnipComplete: (text: string) => Promise<void>
  videoElement?: HTMLElement | null
}

export default function SnipOverlay({
  isActive,
  onClose,
  onSnipComplete,
  videoElement
}: SnipOverlayProps) {
  const [isSelecting, setIsSelecting] = useState(false)
  const [startPos, setStartPos] = useState({ x: 0, y: 0 })
  const [endPos, setEndPos] = useState({ x: 0, y: 0 })
  const [selectedText, setSelectedText] = useState<string | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [copied, setCopied] = useState(false)
  const overlayRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!isActive) {
      setIsSelecting(false)
      setSelectedText(null)
      setCopied(false)
      return
    }

    const handleMouseDown = (e: MouseEvent) => {
      if (!isActive) return
      setIsSelecting(true)
      setStartPos({ x: e.clientX, y: e.clientY })
      setEndPos({ x: e.clientX, y: e.clientY })
      setSelectedText(null)
      setCopied(false)
    }

    const handleMouseMove = (e: MouseEvent) => {
      if (!isSelecting) return
      setEndPos({ x: e.clientX, y: e.clientY })
    }

    const handleMouseUp = async () => {
      if (!isSelecting) return
      setIsSelecting(false)

      // Extract selected text from DOM
      const selection = window.getSelection()
      if (selection && selection.toString().trim()) {
        const text = selection.toString().trim()
        setSelectedText(text)
      } else {
        // Try to get text from selected area using OCR API (would need video frame capture)
        // For now, show message that area selection is captured
        setSelectedText('Area selected - OCR extraction coming soon')
      }
    }

    if (isActive) {
      document.addEventListener('mousedown', handleMouseDown)
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
    }

    return () => {
      document.removeEventListener('mousedown', handleMouseDown)
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isActive, isSelecting])

  if (!isActive) return null

  const rect = isSelecting
    ? {
        left: Math.min(startPos.x, endPos.x),
        top: Math.min(startPos.y, endPos.y),
        width: Math.abs(endPos.x - startPos.x),
        height: Math.abs(endPos.y - startPos.y)
      }
    : null

  const handleCopy = async () => {
    if (!selectedText) return

    try {
      // Copy to clipboard
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(selectedText)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      }

      // Persist snip
      if (onSnipComplete) {
        setIsProcessing(true)
        await onSnipComplete(selectedText)
        setIsProcessing(false)
      }
    } catch (error) {
      console.error('Failed to copy snip:', error)
    }
  }

  const handleClose = () => {
    setIsSelecting(false)
    setSelectedText(null)
    setCopied(false)
    onClose()
  }

  return (
    <>
      {/* Selection overlay */}
      {rect && (
        <div
          className="fixed border-2 border-blue-400 bg-blue-400/10 pointer-events-none z-[60]"
          style={{
            left: `${rect.left}px`,
            top: `${rect.top}px`,
            width: `${rect.width}px`,
            height: `${rect.height}px`
          }}
        />
      )}

      {/* Instructions overlay */}
      <div className="fixed top-4 left-1/2 -translate-x-1/2 bg-zinc-900 border border-zinc-700 rounded-lg px-4 py-3 shadow-2xl z-[61]">
        <div className="flex items-center gap-3">
          <div className="text-sm text-white">
            {isSelecting ? 'Selecting area...' : selectedText ? 'Text selected' : 'Click and drag to select area'}
          </div>
          <button
            onClick={handleClose}
            className="text-zinc-400 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Selected text panel */}
      {selectedText && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 w-full max-w-2xl bg-zinc-900 border border-zinc-700 rounded-lg p-4 shadow-2xl z-[61]">
          <div className="flex items-start justify-between gap-4 mb-3">
            <div className="flex-1">
              <div className="text-xs text-zinc-400 mb-1">Selected Text</div>
              <div className="text-sm text-white bg-zinc-800 rounded p-2 max-h-32 overflow-y-auto font-mono">
                {selectedText}
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleCopy}
                disabled={isProcessing}
                className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                title="Copy to clipboard and save"
              >
                {copied ? (
                  <>
                    <Check className="w-4 h-4" />
                    Copied
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    Copy
                  </>
                )}
              </button>
              <button
                onClick={handleClose}
                className="px-3 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded text-sm transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/20 z-[59]"
        onClick={handleClose}
      />
    </>
  )
}

