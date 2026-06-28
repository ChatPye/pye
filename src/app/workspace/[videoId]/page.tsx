'use client';

import { useMemo, useEffect, useState, useCallback } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import WorkspaceShell from '@/components/workspace/WorkspaceShell';

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
  transcript?: TranscriptSegment[];
  embeddings?: Array<{ text: string; start: number; duration: number; embedding: number[] }>;
  chapters?: ChapterRecord[];
  summary?: string;
  keyPoints?: string[];
  tags?: string[];
};

export default function WorkspacePage() {
  const params = useParams<{ videoId: string }>();
  const searchParams = useSearchParams();
  const [videoRecord, setVideoRecord] = useState<VideoRecord | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingError, setProcessingError] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const rawVideoId = useMemo(
    () => (params?.videoId ? decodeURIComponent(params.videoId) : undefined),
    [params?.videoId]
  );

  const videoSource = searchParams.get('source');
  const source = videoSource === 'upload' ? 'upload' : 'youtube';

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

  useEffect(() => {
    if (!rawVideoId) return;

    let cancelled = false;
    let pollTimer: NodeJS.Timeout | null = null;

    const fetchStatus = async (): Promise<boolean> => {
      try {
        const response = await fetch(`/api/video/process?videoId=${encodeURIComponent(rawVideoId)}`, {
          credentials: 'include',
        });

        if (!response.ok) {
          if (!cancelled) {
            const data = await response.json().catch(() => null);
            setLoadError(data?.error || 'Unable to load video status');
            setIsProcessing(false);
          }
          return true;
        }

        const data = await response.json();
        if (cancelled) return true;

        if (data?.video) {
          setVideoRecord(data.video);
          const status = data.video.processingStatus as VideoRecord['processingStatus'];

          if (status === 'complete') {
            setIsProcessing(false);
            return true;
          }

          if (status === 'failed') {
            setProcessingError('Video processing failed. Please re-upload or try another video.');
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
        if (!cancelled) {
          console.error('Video status poll failed', error);
          setLoadError('Network error while loading video status');
          setIsProcessing(false);
        }
        return true;
      }
    };

    const startProcessing = async () => {
      setProcessingError(null);
      setLoadError(null);
      setIsProcessing(true);

      try {
        await fetch('/api/video/process', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ videoId: rawVideoId, source }),
        });
      } catch (error) {
        console.error('Failed to initiate video processing', error);
        if (!cancelled) {
          setLoadError('Unable to initiate video processing. Please try again.');
          setIsProcessing(false);
        }
        return;
      }

      const completedImmediately = await fetchStatus();
      if (completedImmediately) {
        return;
      }

      pollTimer = setInterval(async () => {
        const finished = await fetchStatus();
        if (finished && pollTimer) {
          clearInterval(pollTimer);
          pollTimer = null;
        }
      }, 5000);
    };

    startProcessing();

    return () => {
      cancelled = true;
      if (pollTimer) {
        clearInterval(pollTimer);
      }
    };
  }, [rawVideoId, source]);

  if (!rawVideoId) {
    return <div className="min-h-screen bg-black text-white flex items-center justify-center">Video not found.</div>;
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

  if (processingError) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center space-y-4">
          <h1 className="text-2xl font-semibold">Processing error</h1>
          <p className="text-zinc-400">{processingError}</p>
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
        thumbnail: videoRecord.thumbnail || `/api/thumbnail/${rawVideoId}`,
        views: (videoRecord as any).views,
        likes: (videoRecord as any).likes,
        tags: videoRecord.tags || [],
      }
    : undefined;

  return (
    <WorkspaceShell
      videoId={rawVideoId}
      videoTitle={videoRecord?.title}
      source={source}
      uploadedName={uploadedName}
      processingStatus={videoRecord?.processingStatus || (isProcessing ? 'pending' : 'complete')}
      videoData={workspaceVideoData}
      chapters={mappedChapters}
      resources={[]}
      threads={[]}
      transcript={videoRecord?.transcript}
      embeddings={videoRecord?.embeddings}
      summary={videoRecord?.summary}
      keyPoints={videoRecord?.keyPoints}
    />
  );
}
