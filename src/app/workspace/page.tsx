'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@clerk/nextjs';
import WorkspaceShell from '@/components/workspace/WorkspaceShell';
import LearningSetupExperience from '@/components/workspace/LearningSetupExperience';
import NotificationPrompt from '@/components/workspace/NotificationPrompt';
import { uploadVideoFile } from '@/lib/upload-video';
import {
  clearPendingUploadFlag,
  consumePendingUpload,
  hasPendingUploadFlag,
} from '@/lib/pending-upload-store';
import { consumePendingYouTubeUrl, hasPendingYouTubeUrl } from '@/lib/pending-youtube-store';
import { extractYouTubeVideoId } from '@/lib/youtube';

function ResumeUploadHandler() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isSignedIn, isLoaded } = useAuth();
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStage, setUploadStage] = useState('preparing');

  useEffect(() => {
    if (!isLoaded || !isSignedIn) return;

    const shouldResume =
      searchParams.get('resumeUpload') === '1' || hasPendingUploadFlag();
    if (!shouldResume) return;

    let cancelled = false;

    (async () => {
      setUploading(true);
      setUploadError('');
      try {
        const file = await consumePendingUpload();
        clearPendingUploadFlag();

        if (!file) {
          if (shouldResume) {
            setUploadError('No saved video found. Please attach your file again.');
          }
          return;
        }

        const result = await uploadVideoFile(
          file,
          file.name.replace(/\.[^/.]+$/, ''),
          (pct, stage) => {
            setUploadProgress(pct);
            setUploadStage(stage);
          }
        );

        if (cancelled) return;

        if (!result.success || !result.videoId) {
          setUploadError(result.error || 'Upload failed after sign-in.');
          return;
        }

        router.replace(
          `/workspace/${encodeURIComponent(result.videoId)}?source=upload`
        );
      } catch (err) {
        if (!cancelled) {
          setUploadError(err instanceof Error ? err.message : 'Upload failed');
        }
      } finally {
        if (!cancelled) setUploading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isLoaded, isSignedIn, router, searchParams]);

  if (!uploading && !uploadError) return null;

  return (
    <>
      <NotificationPrompt enabled={uploading} />
      {uploading && (
        <LearningSetupExperience
          mode="upload"
          progress={uploadProgress}
          stage={uploadStage}
          compact
        />
      )}
      {uploadError && !uploading && (
        <div className="border-b border-rose-500/30 bg-rose-500/10 px-4 py-2 text-center text-xs text-rose-300">
          {uploadError}
        </div>
      )}
    </>
  );
}

function WorkspaceContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const source = searchParams.get('source');
  const videoIdParam = searchParams.get('videoId');
  const resumeUpload = searchParams.get('resumeUpload') === '1';
  const resumeYoutube = searchParams.get('resumeYoutube') === '1';

  useEffect(() => {
    if (!resumeYoutube && !hasPendingYouTubeUrl()) return;
    const url = consumePendingYouTubeUrl();
    const videoId = url ? extractYouTubeVideoId(url) : null;
    if (videoId) router.replace(`/workspace/${encodeURIComponent(videoId)}?source=youtube`);
  }, [resumeYoutube, router]);

  if (videoIdParam) {
    const videoId = decodeURIComponent(videoIdParam);
    const params = new URLSearchParams();
    if (source) params.set('source', source);
    const query = params.toString();
    window.location.href = `/workspace/${encodeURIComponent(videoId)}${query ? `?${query}` : ''}`;
    return null;
  }

  if (resumeUpload || hasPendingUploadFlag()) {
    return (
      <>
        <ResumeUploadHandler />
        <WorkspaceShell />
      </>
    );
  }

  if (resumeYoutube || hasPendingYouTubeUrl()) return null;

  return <WorkspaceShell source={source === 'upload' ? 'upload' : 'youtube'} />;
}

export default function WorkspacePage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-black text-white">
          <div className="h-10 w-10 animate-spin rounded-full border-b-2 border-white" />
        </div>
      }
    >
      <WorkspaceContent />
    </Suspense>
  );
}
