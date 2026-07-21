'use client'

import { useEffect, useRef, useState } from 'react'
import { Check, Copy, Loader2, ScanText, X } from 'lucide-react'

interface SnipOverlayProps {
  isActive: boolean
  onClose: () => void
  onSnipComplete: (text: string) => Promise<void>
  /** Available for uploaded videos. YouTube iframes cannot be read by a web page. */
  videoElement?: HTMLVideoElement | null
  source?: 'youtube' | 'upload'
}

type Point = { x: number; y: number }

function toRect(start: Point, end: Point) {
  return {
    left: Math.min(start.x, end.x),
    top: Math.min(start.y, end.y),
    width: Math.abs(end.x - start.x),
    height: Math.abs(end.y - start.y),
  }
}

function intersects(a: DOMRect, b: { left: number; top: number; width: number; height: number }) {
  return b.left < a.right && b.left + b.width > a.left && b.top < a.bottom && b.top + b.height > a.top
}

export default function SnipOverlay({
  isActive,
  onClose,
  onSnipComplete,
  videoElement,
  source,
}: SnipOverlayProps) {
  const [isSelecting, setIsSelecting] = useState(false)
  const [startPos, setStartPos] = useState<Point>({ x: 0, y: 0 })
  const [endPos, setEndPos] = useState<Point>({ x: 0, y: 0 })
  const [selectedText, setSelectedText] = useState<string | null>(null)
  const [status, setStatus] = useState('Drag over text or code in the video')
  const [isProcessing, setIsProcessing] = useState(false)
  const [copied, setCopied] = useState(false)
  const startRef = useRef<Point>({ x: 0, y: 0 })
  const endRef = useRef<Point>({ x: 0, y: 0 })
  const selectingRef = useRef(false)

  useEffect(() => {
    if (!isActive) {
      selectingRef.current = false
      setIsSelecting(false)
      setSelectedText(null)
      setCopied(false)
      return
    }

    const handleMouseDown = (event: MouseEvent) => {
      // Keep controls in the snip panel clickable.
      if ((event.target as HTMLElement).closest('[data-snip-controls]')) return
      const point = { x: event.clientX, y: event.clientY }
      selectingRef.current = true
      startRef.current = point
      endRef.current = point
      setStartPos(point)
      setEndPos(point)
      setIsSelecting(true)
      setSelectedText(null)
      setCopied(false)
      setStatus('Selecting frame…')
    }

    const handleMouseMove = (event: MouseEvent) => {
      if (!selectingRef.current) return
      const point = { x: event.clientX, y: event.clientY }
      endRef.current = point
      setEndPos(point)
    }

    const handleMouseUp = async () => {
      if (!selectingRef.current) return
      selectingRef.current = false
      setIsSelecting(false)

      const selection = window.getSelection()?.toString().trim()
      if (selection) {
        setSelectedText(selection)
        setStatus('Text selected — review it, then copy and save.')
        return
      }

      const selectedArea = toRect(startRef.current, endRef.current)
      if (selectedArea.width < 8 || selectedArea.height < 8) {
        setStatus('Drag a larger area over visible text or code.')
        return
      }

      if (!videoElement || source === 'youtube') {
        setStatus('Frame OCR is available for uploaded videos. For YouTube, ask the tutor to extract the code at this timestamp.')
        return
      }

      const bounds = videoElement.getBoundingClientRect()
      if (!intersects(bounds, selectedArea) || !videoElement.videoWidth || !videoElement.videoHeight) {
        setStatus('Select an area inside the video frame to extract text.')
        return
      }

      const left = Math.max(selectedArea.left, bounds.left)
      const top = Math.max(selectedArea.top, bounds.top)
      const right = Math.min(selectedArea.left + selectedArea.width, bounds.right)
      const bottom = Math.min(selectedArea.top + selectedArea.height, bounds.bottom)
      const cropWidth = Math.max(1, right - left)
      const cropHeight = Math.max(1, bottom - top)

      setIsProcessing(true)
      setStatus('Reading text from the selected frame…')
      try {
        const canvas = document.createElement('canvas')
        canvas.width = Math.max(1, Math.round((cropWidth / bounds.width) * videoElement.videoWidth))
        canvas.height = Math.max(1, Math.round((cropHeight / bounds.height) * videoElement.videoHeight))
        const context = canvas.getContext('2d')
        if (!context) throw new Error('Canvas is unavailable')
        context.drawImage(
          videoElement,
          Math.round(((left - bounds.left) / bounds.width) * videoElement.videoWidth),
          Math.round(((top - bounds.top) / bounds.height) * videoElement.videoHeight),
          Math.round((cropWidth / bounds.width) * videoElement.videoWidth),
          Math.round((cropHeight / bounds.height) * videoElement.videoHeight),
          0,
          0,
          canvas.width,
          canvas.height,
        )
        const { ClientSideOCR } = await import('@/lib/ocr-service')
        const result = await ClientSideOCR.extractTextFromCanvas(canvas)
        const text = result.text.trim()
        if (!text) throw new Error('No readable text found')
        setSelectedText(text)
        setStatus(`Text extracted (${Math.round(result.confidence)}% confidence) — review it, then copy and save.`)
      } catch (error) {
        console.error('Frame OCR failed:', error)
        setStatus('We could not read text from this frame. Try a sharper, tighter selection or ask the tutor about the timestamp.')
      } finally {
        setIsProcessing(false)
      }
    }

    document.addEventListener('mousedown', handleMouseDown)
    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
    return () => {
      document.removeEventListener('mousedown', handleMouseDown)
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isActive, source, videoElement])

  if (!isActive) return null

  const rect = isSelecting ? toRect(startPos, endPos) : null

  const handleCopy = async () => {
    if (!selectedText) return
    setIsProcessing(true)
    try {
      await navigator.clipboard.writeText(selectedText)
      await onSnipComplete(selectedText)
      setCopied(true)
      setStatus('Copied and saved to your SkillProof evidence.')
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      console.error('Failed to copy snip:', error)
      setStatus('Could not copy this snip. Please try again.')
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <>
      {rect && <div className="pointer-events-none fixed z-[60] border-2 border-emerald-300 bg-emerald-300/10" style={{ left: rect.left, top: rect.top, width: rect.width, height: rect.height }} />}

      <div data-snip-controls className="fixed left-1/2 top-4 z-[61] w-[min(92vw,680px)] -translate-x-1/2 rounded-2xl border border-white/15 bg-zinc-950/95 px-4 py-3 shadow-2xl backdrop-blur">
        <div className="flex items-start gap-3">
          <ScanText className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300" />
          <p className="flex-1 text-sm text-white">{isProcessing ? 'Processing…' : status}</p>
          <button type="button" onClick={onClose} className="rounded p-1 text-zinc-400 transition hover:bg-white/10 hover:text-white" aria-label="Close snip mode"><X className="h-4 w-4" /></button>
        </div>
      </div>

      {selectedText && (
        <div data-snip-controls className="fixed bottom-4 left-1/2 z-[61] w-[min(92vw,720px)] -translate-x-1/2 rounded-2xl border border-white/15 bg-zinc-950/95 p-4 shadow-2xl backdrop-blur">
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-white/45">Extracted text</p>
          <pre className="max-h-44 overflow-auto whitespace-pre-wrap rounded-xl border border-white/10 bg-black/30 p-3 text-xs leading-5 text-zinc-100">{selectedText}</pre>
          <div className="mt-3 flex justify-end gap-2">
            <button type="button" onClick={onClose} className="rounded-lg border border-white/15 px-3 py-2 text-sm text-zinc-200 hover:bg-white/10">Done</button>
            <button type="button" onClick={handleCopy} disabled={isProcessing} className="inline-flex items-center gap-2 rounded-lg bg-emerald-400 px-3 py-2 text-sm font-semibold text-black transition hover:bg-emerald-300 disabled:opacity-50">
              {isProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              {copied ? 'Copied' : 'Copy & save'}
            </button>
          </div>
        </div>
      )}
    </>
  )
}
