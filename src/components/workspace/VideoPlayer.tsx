'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import Plyr from 'plyr';
import 'plyr/dist/plyr.css';
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

const MAX_RETRIES = 3;

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
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const plyrRef = useRef<Plyr | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  const streamSrc = `/api/video/${encodeURIComponent(videoId)}/stream`;

  const handleRetry = useCallback(() => {
    setLoadError(null);
    setRetryCount((c) => c + 1);
  }, []);

  useEffect(() => {
    if (source !== 'upload' || !containerRef.current) return;

    const video = document.createElement('video');
    video.className = 'w-full h-full';
    video.playsInline = true;
    video.preload = 'metadata';
    video.crossOrigin = 'anonymous';
    if (posterUrl) video.poster = posterUrl;

    const sourceEl = document.createElement('source');
    sourceEl.src = `${streamSrc}?v=${retryCount}`;
    sourceEl.type = 'video/mp4';
    video.appendChild(sourceEl);

    containerRef.current.innerHTML = '';
    containerRef.current.appendChild(video);
    videoRef.current = video;
    onVideoRef?.(video);

    const player = new Plyr(video, {
      controls: [
        'play-large',
        'play',
        'progress',
        'current-time',
        'duration',
        'mute',
        'volume',
        'settings',
        'pip',
        'airplay',
        'fullscreen',
      ],
      settings: ['quality', 'speed'],
      speed: { selected: 1, options: [0.5, 0.75, 1, 1.25, 1.5, 2] },
      ratio: '16:9',
      loadSprite: false,
      keyboard: { focused: true, global: false },
      tooltips: { controls: true, seek: true },
    });

    plyrRef.current = player;

    const syncTime = () => {
      const t = safeSeconds(video.currentTime);
      const d = safeSeconds(video.duration);
      onTimeUpdate?.(t, d);
    };

    const onLoaded = () => {
      setLoadError(null);
      syncTime();
    };

    const onError = () => {
      if (retryCount < MAX_RETRIES) {
        setTimeout(() => handleRetry(), 1500);
        return;
      }
      setLoadError('Video failed to load. Check your connection and try again.');
    };

    player.on('timeupdate', syncTime);
    player.on('seeked', () => {
      syncTime();
      onSeek?.(safeSeconds(video.currentTime));
    });
    player.on('loadedmetadata', onLoaded);
    player.on('error', onError);
    video.addEventListener('error', onError);

    return () => {
      player.destroy();
      plyrRef.current = null;
      videoRef.current = null;
      onVideoRef?.(null);
    };
  }, [
    source,
    streamSrc,
    posterUrl,
    retryCount,
    onTimeUpdate,
    onSeek,
    onVideoRef,
    handleRetry,
    videoId,
  ]);

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

  return (
    <div className={`relative ${className}`}>
      <div
        ref={containerRef}
        className="plyr-react aspect-video overflow-hidden rounded-xl bg-black"
        data-plyr-provider="html5"
      />

      {loadError && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 rounded-xl bg-black/85 px-4 text-center text-sm text-rose-300">
          <p>{loadError}</p>
          <button
            type="button"
            onClick={handleRetry}
            className="rounded-lg border border-white/20 px-4 py-2 text-xs text-white hover:bg-white/10"
          >
            Retry playback
          </button>
        </div>
      )}

      {retryCount > 0 && !loadError && (
        <p className="mt-1 text-center text-[10px] text-zinc-600">
          Buffering… attempt {retryCount + 1}
        </p>
      )}
    </div>
  );
}

// Re-export for seek helpers used elsewhere
export { formatMediaTime };
