'use client'

import { useState, useRef, useEffect, useImperativeHandle, forwardRef } from 'react'
import { Play, Pause, Volume2, VolumeX, Maximize, Settings, Clock } from 'lucide-react'

interface VideoPlayerProps {
  videoId: string
  title?: string
  source: 'youtube' | 'upload'
  onTimeUpdate?: (currentTime: number, duration: number) => void
  onSeek?: (timeInSeconds: number) => void
  className?: string
}

export default function VideoPlayer({ 
  videoId, 
  title, 
  source, 
  onTimeUpdate,
  onSeek,
  className = '' 
}: VideoPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [showControls, setShowControls] = useState(true)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)
  const controlsTimeoutRef = useRef<NodeJS.Timeout>()

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const handlePlayPause = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause()
      } else {
        videoRef.current.play()
      }
      setIsPlaying(!isPlaying)
    }
  }

  const handleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted
      setIsMuted(!isMuted)
    }
  }

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (videoRef.current) {
      const time = parseFloat(e.target.value)
      videoRef.current.currentTime = time
      setCurrentTime(time)
    }
  }

  const handleFullscreen = () => {
    if (videoRef.current) {
      if (!isFullscreen) {
        videoRef.current.requestFullscreen()
        setIsFullscreen(true)
      } else {
        document.exitFullscreen()
        setIsFullscreen(false)
      }
    }
  }

  const handleMouseMove = () => {
    setShowControls(true)
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current)
    }
    controlsTimeoutRef.current = setTimeout(() => {
      setShowControls(false)
    }, 3000)
  }

  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    const handleTimeUpdate = () => {
      setCurrentTime(video.currentTime)
      setDuration(video.duration)
      onTimeUpdate?.(video.currentTime, video.duration)
    }

    const handleLoadedMetadata = () => {
      setDuration(video.duration)
    }

    const handlePlay = () => setIsPlaying(true)
    const handlePause = () => setIsPlaying(false)

    video.addEventListener('timeupdate', handleTimeUpdate)
    video.addEventListener('loadedmetadata', handleLoadedMetadata)
    video.addEventListener('play', handlePlay)
    video.addEventListener('pause', handlePause)

    return () => {
      video.removeEventListener('timeupdate', handleTimeUpdate)
      video.removeEventListener('loadedmetadata', handleLoadedMetadata)
      video.removeEventListener('play', handlePlay)
      video.removeEventListener('pause', handlePause)
    }
  }, [onTimeUpdate])

  const iframeRef = useRef<HTMLIFrameElement>(null)

  // Expose seek function for YouTube iframes
  useEffect(() => {
    if (source === 'youtube' && iframeRef.current && onSeek) {
      // Store seek function for external calls
      ;(iframeRef.current as any).seekToTime = (time: number) => {
        const iframe = iframeRef.current
        if (iframe && iframe.contentWindow) {
          iframe.contentWindow.postMessage(
            JSON.stringify({
              event: 'command',
              func: 'seekTo',
              args: [Math.floor(time), true]
            }),
            'https://www.youtube.com'
          )
        }
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

  return (
    <div 
      className={`relative aspect-video bg-black rounded-xl overflow-hidden group ${className}`}
      onMouseMove={handleMouseMove}
      onMouseLeave={() => setShowControls(false)}
    >
      <video
        ref={videoRef}
        className="w-full h-full object-cover"
        poster={`/api/thumbnail/${videoId}`}
        preload="metadata"
      >
        <source src={`/api/video/${videoId}`} type="video/mp4" />
        Your browser does not support the video tag.
      </video>

      {/* Overlay Controls */}
      <div className={`absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent transition-opacity duration-300 ${showControls ? 'opacity-100' : 'opacity-0'}`}>
        {/* Top Controls */}
        <div className="absolute top-4 left-4 right-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="text-white font-medium truncate max-w-xs">{title}</h3>
          </div>
          <div className="flex items-center gap-2">
            <button className="p-2 rounded-full bg-black/50 hover:bg-black/70 transition-colors">
              <Settings className="w-5 h-5 text-white" />
            </button>
            <button 
              onClick={handleFullscreen}
              className="p-2 rounded-full bg-black/50 hover:bg-black/70 transition-colors"
            >
              <Maximize className="w-5 h-5 text-white" />
            </button>
          </div>
        </div>

        {/* Center Play Button */}
        <div className="absolute inset-0 flex items-center justify-center">
          <button
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

        {/* Bottom Controls */}
        <div className="absolute bottom-4 left-4 right-4">
          {/* Progress Bar */}
          <div className="mb-3">
            <input
              type="range"
              min="0"
              max={duration || 0}
              value={currentTime}
              onChange={handleSeek}
              className="w-full h-1 bg-white/30 rounded-lg appearance-none cursor-pointer slider"
            />
          </div>

          {/* Control Buttons */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
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
                <span>{formatTime(currentTime)} / {formatTime(duration)}</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleFullscreen}
                className="p-2 rounded-full bg-black/50 hover:bg-black/70 transition-colors"
              >
                <Maximize className="w-5 h-5 text-white" />
              </button>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        .slider::-webkit-slider-thumb {
          appearance: none;
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: #3b82f6;
          cursor: pointer;
        }
        .slider::-moz-range-thumb {
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: #3b82f6;
          cursor: pointer;
          border: none;
        }
      `}</style>
    </div>
  )
}
