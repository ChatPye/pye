'use client';

import { Suspense, useMemo, useEffect, useState, useCallback, useRef } from 'react';
import Link from 'next/link';
import { useParams, useSearchParams } from 'next/navigation';
import WorkspaceShell from '@/components/workspace/WorkspaceShell';
import NotificationPrompt from '@/components/workspace/NotificationPrompt';
import { isUploadVideoId } from '@/lib/video-upload-utils';
import { NotificationService } from '@/lib/notifications';

type TranscriptSegment = {
  text: string;
  start: number;
  duration: number;
};

type ChapterRecord = {
  start: number;
  title: string;
  summary?: string;
};

type VideoRecord = {
  videoId: string;
  title: string;
  channel: string;
  description: string;
  duration: number;
  thumbnail: string;
  published: string;
  source: 'youtube' | 'upload' | 'unknown';
  processingStatus: 'queued' | 'pending' | 'extracting' | 'transcribing' | 'embedding' | 'complete' | 'failed';
  errorMessage?: string;
  transcript?: TranscriptSegment[];
  embeddings?: Array<{ text: string; start: number; duration: number; embedding: number[] }>;
  chapters?: ChapterRecord[];
  summary?: string;
  keyPoints?: string[];
  tags?: string[];
};

export default function WorkspacePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-black text-white flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white" />
        </div>
      }
    >
      <WorkspaceVideoPage />
    </Suspense>
  );
}

function WorkspaceVideoPage() {
  const params = useParams<{ videoId: string }>();
  const searchParams = useSearchParams();
  const [videoRecord, setVideoRecord] = useState<VideoRecord | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingError, setProcessingError] = useState<string | null>(null);
  const [processingProgress, setProcessingProgress] = useState(0);
  const [loadError, setLoadError] = useState<string | null>(null);
  const notifiedRef = useRef(false);

  const rawVideoId = useMemo(
    () => (params?.videoId ? decodeURIComponent(params.videoId) : undefined),
    [params?.videoId]
  );

  const videoSourceParam = searchParams.get('source');
  const resolvedSource: 'youtube' | 'upload' =
    videoSourceParam === 'upload' || (rawVideoId ? isUploadVideoId(rawVideoId) : false)
      ? 'upload'
      : videoRecord?.source === 'upload'
        ? 'upload'
        : 'youtube';

  const uploadedNameParam = searchParams.get('name');
  const uploadedName = uploadedNameParam ? decodeURIComponent(uploadedNameParam) : undefined;

  const mapChapters = useCallback(
    (chapters: ChapterRecord[] | undefined, duration: number | undefined) => {
      if (!chapters || chapters.length === 0) return [];
      return chapters.map((chapter, index) => {
        const nextStart = chapters[index + 1]?.start ?? duration ?? chapter.start + 180;
        return {
          id: `chapter-${index}`,
          title: chapter.title || `Chapter ${index + 1}`,
          startTime: Math.max(0, chapter.start || 0),
          duration: Math.max(0, Math.round(nextStart - chapter.start)),
          description: chapter.summary,
        };
      });
    },
    []
  );

  const fetchStatus = useCallback(async (): Promise<boolean> => {
    if (!rawVideoId) return true;
    try {
      const response = await fetch(
        `/api/video/process?videoId=${encodeURIComponent(rawVideoId)}`,
        { credentials: 'include' }
      );

      if (!response.ok) {
        if (response.status === 429) {
          return false;
        }
        const data = await response.json().catch(() => null);
        if (response.status >= 500) {
          return false;
        }
        setLoadError(data?.error || 'Unable to load video status');
        setIsProcessing(false);
        return true;
      }

      const data = await response.json();
      if (data?.video) {
        setVideoRecord(data.video);
        const status = data.video.processingStatus as VideoRecord['processingStatus'];

        if (status === 'complete') {
          setIsProcessing(false);
          setProcessingError(null);
          setProcessingProgress(100);
          if (!notifiedRef.current && NotificationService.getSupported()) {
            NotificationService.requestPermission().then((granted) => {
              if (granted) {
                NotificationService.showProcessingComplete(
                  rawVideoId,
                  data.video.title
                );
              }
            });
            notifiedRef.current = true;
          }
          return true;
        }

        if (status === 'failed') {
          setProcessingError(
            data.video.errorMessage || 'Video processing failed. Tap Retry processing below.'
          );
          setIsProcessing(false);
          return true;
        }

        setIsProcessing(true);
        return false;
      }

      setLoadError('Video data unavailable');
      setIsProcessing(false);
      return true;
    } catch (error) {
      console.error('Video status poll failed', error);
      return false;
    }
  }, [rawVideoId]);

  const runProcessingTick = useCallback(async () => {
    if (!rawVideoId) return true;
    try {
      const response = await fetch('/api/video/process/tick', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ videoId: rawVideoId, source: resolvedSource }),
      });
      if (response.status === 429) {
        return false;
      }
      const data = await response.json().catch(() => ({}));
      if (typeof data.progress === 'number') {
        setProcessingProgress(data.progress);
      }
      if (data.video) {
        setVideoRecord(data.video);
      }
      if (data.status === 'complete') {
        setIsProcessing(false);
        setProcessingError(null);
        setProcessingProgress(100);
        if (!notifiedRef.current && NotificationService.getSupported()) {
          NotificationService.requestPermission().then((granted) => {
            if (granted) {
              NotificationService.showProcessingComplete(
                rawVideoId,
                data.video?.title
              );
            }
          });
          notifiedRef.current = true;
        }
        return true;
      }
      if (data.status === 'failed') {
        setProcessingError(data.error || 'Processing failed');
        setIsProcessing(false);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Processing tick failed', error);
      return false;
    }
  }, [rawVideoId, resolvedSource]);

  const handleRetryProcessing = useCallback(async () => {
    if (!rawVideoId) return;
    setProcessingError(null);
    setIsProcessing(true);
    setProcessingProgress(10);
    await fetch('/api/video/process', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ videoId: rawVideoId, source: resolvedSource, retry: true }),
    }).catch(() => null);
    await runProcessingTick();
  }, [rawVideoId, resolvedSource, runProcessingTick]);

  useEffect(() => {
    if (!rawVideoId) return;

    let cancelled = false;
    let pollTimer: NodeJS.Timeout | null = null;

    const bootstrap = async () => {
      setProcessingError(null);
      setLoadError(null);
      setIsProcessing(true);

      await fetch('/api/video/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ videoId: rawVideoId, source: resolvedSource }),
      }).catch(() => null);

      if (cancelled) return;

      await runProcessingTick();
      const done = await fetchStatus();
      if (done || cancelled) return;

      pollTimer = setInterval(async () => {
        await runProcessingTick();
        const finished = await fetchStatus();
        if (finished && pollTimer) {
          clearInterval(pollTimer);
          pollTimer = null;
        }
      }, 4000);
    };

    bootstrap();

    return () => {
      cancelled = true;
      if (pollTimer) clearInterval(pollTimer);
    };
  }, [rawVideoId, resolvedSource, fetchStatus, runProcessingTick]);

  if (!rawVideoId) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        Video not found.
      </div>
    );
  }

  if (resolvedSource === 'upload' && rawVideoId && !isUploadVideoId(rawVideoId)) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center px-6">
        <div className="text-center space-y-4 max-w-md">
          <h1 className="text-2xl font-semibold">Video not uploaded</h1>
          <p className="text-zinc-400">
            &ldquo;{rawVideoId}&rdquo; is a filename, not an uploaded video. Use Attach to upload
            your file, or start from the home page.
          </p>
          <Link href="/workspace" className="inline-block text-blue-400 hover:text-blue-300">
            Back to workspace
          </Link>
        </div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center space-y-4">
          <h1 className="text-2xl font-semibold">Unable to load video</h1>
          <p className="text-zinc-400">{loadError}</p>
        </div>
      </div>
    );
  }

  const mappedChapters = mapChapters(videoRecord?.chapters, videoRecord?.duration);

  const workspaceVideoData = videoRecord
    ? {
        title: videoRecord.title || `Video ${rawVideoId}`,
        channel: videoRecord.channel || 'Unknown Channel',
        description: videoRecord.description || '',
        duration: videoRecord.duration || 0,
        publishedAt: videoRecord.published || new Date().toISOString(),
        thumbnail: videoRecord.thumbnail || '',
        views: (videoRecord as VideoRecord & { views?: number }).views,
        likes: (videoRecord as VideoRecord & { likes?: number }).likes,
        tags: videoRecord.tags || [],
      }
    : undefined;

  return (
    <>
      <NotificationPrompt enabled={isProcessing} videoId={rawVideoId} />
      <WorkspaceShell
      videoId={rawVideoId}
      videoTitle={videoRecord?.title}
      source={resolvedSource}
      uploadedName={uploadedName}
      processingStatus={videoRecord?.processingStatus || (isProcessing ? 'pending' : 'complete')}
      processingProgress={processingProgress}
      processingError={processingError}
      onRetryProcessing={handleRetryProcessing}
      videoData={workspaceVideoData}
      chapters={mappedChapters}
      resources={[]}
      threads={[]}
      transcript={videoRecord?.transcript}
      embeddings={videoRecord?.embeddings}
      summary={videoRecord?.summary}
      keyPoints={videoRecord?.keyPoints}
    />
    </>
  );
}
