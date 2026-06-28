'use client'

import { useState, useRef, useEffect } from 'react'
import { Play, Pause, Volume2, VolumeX, Maximize, Settings, Clock } from 'lucide-react'
import { formatMediaTime, safeSeconds } from '@/lib/time-utils'

interface VideoPlayerProps {
  videoId: string
  title?: string
  source: 'youtube' | 'upload'
  posterUrl?: string
  onTimeUpdate?: (currentTime: number, duration: number) => void
  onSeek?: (timeInSeconds: number) => void
  onVideoRef?: (video: HTMLVideoElement | null) => void
  className?: string
}

export default function VideoPlayer({
  videoId,
  title,
  source,
  posterUrl,
  onTimeUpdate,
  onSeek,
  onVideoRef,
  className = '',
}: VideoPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [showControls, setShowControls] = useState(true)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const controlsTimeoutRef = useRef<NodeJS.Timeout>()
  const iframeRef = useRef<HTMLIFrameElement>(null)

  const setVideoRef = (el: HTMLVideoElement | null) => {
    videoRef.current = el
    onVideoRef?.(el)
  }

  const handlePlayPause = () => {
    const video = videoRef.current
    if (!video) return
    if (isPlaying) {
      video.pause()
    } else {
      void video.play().catch(() => setLoadError('Unable to play video'))
    }
  }

  const handleMute = () => {
    const video = videoRef.current
    if (!video) return
    video.muted = !isMuted
    setIsMuted(!isMuted)
  }

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const video = videoRef.current
    if (!video) return
    const time = parseFloat(e.target.value)
    video.currentTime = time
    setCurrentTime(time)
    onSeek?.(time)
  }

  const handleFullscreen = () => {
    const video = videoRef.current
    if (!video) return
    if (!isFullscreen) {
      void video.requestFullscreen()
      setIsFullscreen(true)
    } else {
      void document.exitFullscreen()
      setIsFullscreen(false)
    }
  }

  const handleMouseMove = () => {
    setShowControls(true)
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current)
    controlsTimeoutRef.current = setTimeout(() => setShowControls(false), 3000)
  }

  useEffect(() => {
    const video = videoRef.current
    if (!video || source !== 'upload') return

    const syncTime = () => {
      const t = safeSeconds(video.currentTime)
      const d = safeSeconds(video.duration)
      setCurrentTime(t)
      setDuration(d)
      onTimeUpdate?.(t, d)
    }

    const onLoaded = () => {
      setLoadError(null)
      syncTime()
    }

    const onError = () => setLoadError('Video failed to load. Try refreshing the page.')

    video.addEventListener('timeupdate', syncTime)
    video.addEventListener('loadedmetadata', onLoaded)
    video.addEventListener('play', () => setIsPlaying(true))
    video.addEventListener('pause', () => setIsPlaying(false))
    video.addEventListener('error', onError)

    return () => {
      video.removeEventListener('timeupdate', syncTime)
      video.removeEventListener('loadedmetadata', onLoaded)
      video.removeEventListener('play', () => setIsPlaying(true))
      video.removeEventListener('pause', () => setIsPlaying(false))
      video.removeEventListener('error', onError)
    }
  }, [source, onTimeUpdate, videoId])

  useEffect(() => {
    if (source === 'youtube' && iframeRef.current && onSeek) {
      ;(iframeRef.current as HTMLIFrameElement & { seekToTime?: (time: number) => void }).seekToTime = (
        time: number
      ) => {
        iframeRef.current?.contentWindow?.postMessage(
          JSON.stringify({ event: 'command', func: 'seekTo', args: [Math.floor(time), true] }),
          'https://www.youtube.com'
        )
      }
    }
  }, [source, onSeek])

  if (source === 'youtube') {
    return (
      <div className={`relative aspect-video bg-black rounded-xl overflow-hidden ${className}`}>
        <iframe
          ref={iframeRef}
          id={`youtube-${videoId}`}
          src={`https://www.youtube.com/embed/${videoId}?enablejsapi=1&rel=0&modestbranding=1&controls=1`}
          title={title || 'Video Player'}
          className="w-full h-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </div>
    )
  }

  const streamSrc = `/api/video/${encodeURIComponent(videoId)}/stream`
  const sliderMax = duration > 0 ? duration : 0

  return (
    <div
      className={`relative aspect-video bg-black rounded-xl overflow-hidden group ${className}`}
      onMouseMove={handleMouseMove}
      onMouseLeave={() => setShowControls(false)}
    >
      <video
        ref={setVideoRef}
        key={streamSrc}
        className="w-full h-full object-contain bg-black"
        poster={posterUrl || undefined}
        preload="metadata"
        playsInline
        controls={false}
      >
        <source src={streamSrc} type="video/mp4" />
        Your browser does not support the video tag.
      </video>

      {loadError && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/80 px-4 text-center text-sm text-rose-300">
          {loadError}
        </div>
      )}

      <div
        className={`absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent transition-opacity duration-300 ${showControls ? 'opacity-100' : 'opacity-0'}`}
      >
        <div className="absolute top-4 left-4 right-4 flex items-center justify-between">
          <h3 className="text-white font-medium truncate max-w-xs">{title}</h3>
          <button
            type="button"
            onClick={handleFullscreen}
            className="p-2 rounded-full bg-black/50 hover:bg-black/70 transition-colors"
          >
            <Maximize className="w-5 h-5 text-white" />
          </button>
        </div>

        <div className="absolute inset-0 flex items-center justify-center">
          <button
            type="button"
            onClick={handlePlayPause}
            className="p-4 rounded-full bg-white/20 hover:bg-white/30 transition-colors backdrop-blur-sm"
          >
            {isPlaying ? (
              <Pause className="w-8 h-8 text-white" />
            ) : (
              <Play className="w-8 h-8 text-white ml-1" />
            )}
          </button>
        </div>

        <div className="absolute bottom-4 left-4 right-4">
          <div className="mb-3">
            <input
              type="range"
              min={0}
              max={sliderMax}
              step={0.1}
              value={Math.min(currentTime, sliderMax || 0)}
              onChange={handleSeek}
              disabled={sliderMax <= 0}
              className="w-full h-1 bg-white/30 rounded-lg appearance-none cursor-pointer"
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handlePlayPause}
                className="p-2 rounded-full bg-black/50 hover:bg-black/70 transition-colors"
              >
                {isPlaying ? (
                  <Pause className="w-5 h-5 text-white" />
                ) : (
                  <Play className="w-5 h-5 text-white" />
                )}
              </button>
              <button
                type="button"
                onClick={handleMute}
                className="p-2 rounded-full bg-black/50 hover:bg-black/70 transition-colors"
              >
                {isMuted ? (
                  <VolumeX className="w-5 h-5 text-white" />
                ) : (
                  <Volume2 className="w-5 h-5 text-white" />
                )}
              </button>
              <div className="flex items-center gap-1 text-white text-sm">
                <Clock className="w-4 h-4" />
                <span>
                  {formatMediaTime(currentTime)} / {formatMediaTime(duration)}
                </span>
              </div>
            </div>
            <button type="button" className="p-2 rounded-full bg-black/50 hover:bg-black/70 transition-colors">
              <Settings className="w-5 h-5 text-white" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
