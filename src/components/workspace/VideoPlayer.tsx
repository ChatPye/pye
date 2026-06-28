'use client';

import { useState, useRef, useEffect } from 'react';
import { Play, Pause, Volume2, VolumeX, Maximize, Settings, Clock } from 'lucide-react';
import { formatMediaTime, safeSeconds } from '@/lib/time-utils';

interface VideoPlayerProps {
  videoId: string;
  title?: string;
  source: 'youtube' | 'upload';
  posterUrl?: string;
  onTimeUpdate?: (currentTime: number, duration: number) => void;
  onSeek?: (timeInSeconds: number) => void;
  onVideoRef?: (video: HTMLVideoElement | null) => void;
  className?: string;
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
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [showControls, setShowControls] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const controlsTimeoutRef = useRef<ReturnType<typeof setTimeout>>();
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const setVideoRef = (el: HTMLVideoElement | null) => {
    videoRef.current = el;
    onVideoRef?.(el);
  };

  const handlePlayPause = () => {
    const video = videoRef.current;
    if (!video) return;
    if (isPlaying) {
      video.pause();
    } else {
      void video.play().catch(() => setLoadError('Unable to play video'));
    }
  };

  const handleMute = () => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const video = videoRef.current;
    if (!video) return;
    const time = parseFloat(e.target.value);
    video.currentTime = time;
    setCurrentTime(time);
    onSeek?.(time);
  };

  const handleFullscreen = () => {
    const video = videoRef.current;
    if (!video) return;
    if (!isFullscreen) {
      void video.requestFullscreen();
      setIsFullscreen(true);
    } else {
      void document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  const handleMouseMove = () => {
    setShowControls(true);
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    controlsTimeoutRef.current = setTimeout(() => setShowControls(false), 3000);
  };

  useEffect(() => {
    const video = videoRef.current;
    if (!video || source !== 'upload') return;

    const syncTime = () => {
      const t = safeSeconds(video.currentTime);
      const d = safeSeconds(video.duration);
      setCurrentTime(t);
      setDuration(d);
      onTimeUpdate?.(t, d);
    };

    const onLoaded = () => {
      setLoadError(null);
      syncTime();
    };

    const onError = () => setLoadError('Video failed to load. Try refreshing the page.');

    video.addEventListener('timeupdate', syncTime);
    video.addEventListener('loadedmetadata', onLoaded);
    video.addEventListener('play', () => setIsPlaying(true));
    video.addEventListener('pause', () => setIsPlaying(false));
    video.addEventListener('error', onError);

    return () => {
      video.removeEventListener('timeupdate', syncTime);
      video.removeEventListener('loadedmetadata', onLoaded);
      video.removeEventListener('play', () => setIsPlaying(true));
      video.removeEventListener('pause', () => setIsPlaying(false));
      video.removeEventListener('error', onError);
    };
  }, [source, onTimeUpdate, videoId]);

  useEffect(() => {
    if (source === 'youtube' && iframeRef.current && onSeek) {
      (
        iframeRef.current as HTMLIFrameElement & { seekToTime?: (time: number) => void }
      ).seekToTime = (time: number) => {
        iframeRef.current?.contentWindow?.postMessage(
          JSON.stringify({ event: 'command', func: 'seekTo', args: [Math.floor(time), true] }),
          'https://www.youtube.com'
        );
      };
    }
  }, [source, onSeek]);

  if (source === 'youtube') {
    return (
      <div className={`relative aspect-video overflow-hidden rounded-xl bg-black ${className}`}>
        <iframe
          ref={iframeRef}
          id={`youtube-${videoId}`}
          src={`https://www.youtube.com/embed/${videoId}?enablejsapi=1&rel=0&modestbranding=1&controls=1`}
          title={title || 'Video Player'}
          className="h-full w-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </div>
    );
  }

  const streamSrc = `/api/video/${encodeURIComponent(videoId)}/stream`;
  const sliderMax = duration > 0 ? duration : 0;

  return (
    <div
      className={`group relative aspect-video overflow-hidden rounded-xl bg-black ${className}`}
      onMouseMove={handleMouseMove}
      onMouseLeave={() => setShowControls(false)}
    >
      <video
        ref={setVideoRef}
        key={streamSrc}
        className="h-full w-full bg-black object-contain"
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
        <div className="absolute left-4 right-4 top-4 flex items-center justify-between">
          <h3 className="max-w-xs truncate font-medium text-white">{title}</h3>
          <button
            type="button"
            onClick={handleFullscreen}
            className="rounded-full bg-black/50 p-2 transition-colors hover:bg-black/70"
          >
            <Maximize className="h-5 w-5 text-white" />
          </button>
        </div>

        <div className="absolute inset-0 flex items-center justify-center">
          <button
            type="button"
            onClick={handlePlayPause}
            className="rounded-full bg-white/20 p-4 backdrop-blur-sm transition-colors hover:bg-white/30"
          >
            {isPlaying ? (
              <Pause className="h-8 w-8 text-white" />
            ) : (
              <Play className="ml-1 h-8 w-8 text-white" />
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
              className="h-1 w-full cursor-pointer appearance-none rounded-lg bg-white/30"
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handlePlayPause}
                className="rounded-full bg-black/50 p-2 transition-colors hover:bg-black/70"
              >
                {isPlaying ? (
                  <Pause className="h-5 w-5 text-white" />
                ) : (
                  <Play className="h-5 w-5 text-white" />
                )}
              </button>
              <button
                type="button"
                onClick={handleMute}
                className="rounded-full bg-black/50 p-2 transition-colors hover:bg-black/70"
              >
                {isMuted ? (
                  <VolumeX className="h-5 w-5 text-white" />
                ) : (
                  <Volume2 className="h-5 w-5 text-white" />
                )}
              </button>
              <div className="flex items-center gap-1 text-sm text-white">
                <Clock className="h-4 w-4" />
                <span>
                  {formatMediaTime(currentTime)} / {formatMediaTime(duration)}
                </span>
              </div>
            </div>
            <button
              type="button"
              className="rounded-full bg-black/50 p-2 transition-colors hover:bg-black/70"
            >
              <Settings className="h-5 w-5 text-white" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export { formatMediaTime };
