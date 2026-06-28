'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@clerk/nextjs';
import WorkspaceShell from '@/components/workspace/WorkspaceShell';
import { uploadVideoFile } from '@/lib/upload-video';
import {
  clearPendingUploadFlag,
  consumePendingUpload,
  hasPendingUploadFlag,
} from '@/lib/pending-upload-store';

function ResumeUploadHandler() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isSignedIn, isLoaded } = useAuth();
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStage, setUploadStage] = useState('Preparing…');

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
            setUploadStage(stage === 'uploading' ? 'Uploading to secure storage…' : 'Finalizing…');
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
    <div className="mx-auto max-w-lg px-6 py-16 text-center text-white">
      {uploading ? (
        <>
          <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-b-2 border-white" />
          <p className="text-zinc-300">{uploadStage}</p>
          <div className="mx-auto mt-4 h-1.5 w-full max-w-xs overflow-hidden rounded-full bg-zinc-800">
            <div
              className="h-full bg-emerald-400 transition-all duration-300"
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
          <p className="mt-2 text-xs text-zinc-500">{uploadProgress}%</p>
        </>
      ) : (
        <p className="text-rose-400">{uploadError}</p>
      )}
    </div>
  );
}

function WorkspaceContent() {
  const searchParams = useSearchParams();
  const source = searchParams.get('source');
  const videoIdParam = searchParams.get('videoId');
  const resumeUpload = searchParams.get('resumeUpload') === '1';

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
        {!hasPendingUploadFlag() && (
          <WorkspaceShell source={source === 'youtube' ? 'youtube' : undefined} />
        )}
      </>
    );
  }

  const workspaceProps: { source?: 'youtube' | 'upload' } = {};
  if (source === 'youtube' || source === 'upload') {
    workspaceProps.source = source;
  }

  return <WorkspaceShell {...workspaceProps} />;
}

export default function WorkspacePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-black flex items-center justify-center">
          <div className="text-white">Loading workspace...</div>
        </div>
      }
    >
      <WorkspaceContent />
    </Suspense>
  );
}
