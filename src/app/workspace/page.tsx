'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import WorkspaceShell from '@/components/workspace/WorkspaceShell';

function WorkspaceContent() {
  const searchParams = useSearchParams();
  const source = searchParams.get('source');
  const videoIdParam = searchParams.get('videoId');

  // Check for videoId in URL (for post-login continuation)
  // If videoId exists, redirect to the video-specific workspace page
  if (videoIdParam) {
    const videoId = decodeURIComponent(videoIdParam);
    const params = new URLSearchParams();
    if (source) params.set('source', source);
    const query = params.toString();
    window.location.href = `/workspace/${encodeURIComponent(videoId)}${query ? `?${query}` : ''}`;
    return null;
  }

  // Show the workspace shell with no specific video - this will show the video input prompt
  const workspaceProps: {
    source?: 'youtube' | 'upload';
  } = {};
  
  if (source === 'youtube' || source === 'upload') {
    workspaceProps.source = source as 'youtube' | 'upload';
  }

  return <WorkspaceShell {...workspaceProps} />;
}

export default function WorkspacePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white">Loading workspace...</div>
      </div>
    }>
      <WorkspaceContent />
    </Suspense>
  );
}
