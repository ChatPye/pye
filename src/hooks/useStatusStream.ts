import { useEffect, useState, useRef } from 'react'
import { NotificationService } from '@/lib/notifications'

interface StatusUpdate {
  status: string
  videoId: string
  progress: number
  message: string
  timestamp: string
}

interface UseStatusStreamOptions {
  videoId: string
  enabled?: boolean
  onStatusChange?: (status: string) => void
  onComplete?: (data: StatusUpdate) => void
  onError?: (error: Error) => void
}

/**
 * Hook for real-time video processing status updates via Server-Sent Events
 */
export function useStatusStream({
  videoId,
  enabled = true,
  onStatusChange,
  onComplete,
  onError
}: UseStatusStreamOptions) {
  const [status, setStatus] = useState<string>('queued')
  const [progress, setProgress] = useState(0)
  const [message, setMessage] = useState('Processing video...')
  const [error, setError] = useState<Error | null>(null)
  const eventSourceRef = useRef<EventSource | null>(null)
  const notificationShownRef = useRef(false)

  useEffect(() => {
    if (!enabled || !videoId) {
      return
    }

    // Cleanup existing connection
    if (eventSourceRef.current) {
      eventSourceRef.current.close()
      eventSourceRef.current = null
    }

    // Only connect if status is not complete/failed
    if (status === 'complete' || status === 'failed') {
      return
    }

    const eventSource = new EventSource(`/api/video/${encodeURIComponent(videoId)}/status/stream`)
    eventSourceRef.current = eventSource

    eventSource.onopen = () => {
      console.log('[StatusStream] Connected to status stream')
    }

    eventSource.addEventListener('status', (event) => {
      try {
        const data: StatusUpdate = JSON.parse(event.data)
        setStatus(data.status)
        setProgress(data.progress)
        setMessage(data.message)
        
        if (onStatusChange) {
          onStatusChange(data.status)
        }
      } catch (err) {
        console.error('[StatusStream] Failed to parse status event:', err)
      }
    })

    eventSource.addEventListener('complete', (event) => {
      try {
        const data: StatusUpdate = JSON.parse(event.data)
        setStatus('complete')
        setProgress(100)
        setMessage(data.message)
        
        if (onComplete) {
          onComplete(data)
        }

        // Show browser notification (only once)
        if (!notificationShownRef.current && NotificationService.getSupported()) {
          NotificationService.showProcessingComplete(videoId, data.message)
          notificationShownRef.current = true
        }

        // Close connection after completion
        setTimeout(() => {
          eventSource.close()
          eventSourceRef.current = null
        }, 1000)
      } catch (err) {
        console.error('[StatusStream] Failed to parse complete event:', err)
      }
    })

    eventSource.addEventListener('error', (event: any) => {
      try {
        const data = event.data ? JSON.parse(event.data) : { message: 'Unknown error' }
        const error = new Error(data.message || 'Status stream error')
        setError(error)
        
        if (onError) {
          onError(error)
        }
      } catch (err) {
        const error = new Error('Failed to parse error event')
        setError(error)
        if (onError) {
          onError(error)
        }
      }
    })

    eventSource.onerror = (err) => {
      console.error('[StatusStream] EventSource error:', err)
      // Don't close on first error - may be temporary network issue
      // Only close if explicitly marked as error event
      if (eventSource.readyState === EventSource.CLOSED) {
        const error = new Error('Status stream closed unexpectedly')
        setError(error)
        if (onError) {
          onError(error)
        }
      }
    }

    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close()
        eventSourceRef.current = null
      }
    }
  }, [videoId, enabled, status, onStatusChange, onComplete, onError])

  return {
    status,
    progress,
    message,
    error,
    isComplete: status === 'complete',
    isFailed: status === 'failed'
  }
}

