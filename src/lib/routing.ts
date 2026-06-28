'use client';

import { useRouter } from 'next/navigation';

export interface LoginSource {
  source: 'hero' | 'extension' | 'direct' | 'referral';
  videoId?: string;
  referralCode?: string;
  query?: Record<string, string | undefined>;
}

function buildWorkspacePath(source: LoginSource = { source: 'direct' }): string {
  const basePath = source.videoId ? `/workspace/${encodeURIComponent(source.videoId)}` : '/workspace';
  const params = new URLSearchParams();

  if (source.source) {
    params.set('source', source.source);
  }

  if (source.referralCode) {
    params.set('ref', source.referralCode);
  }

  if (source.query) {
    Object.entries(source.query).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        params.set(key, value);
      }
    });
  }

  const search = params.toString();
  return search ? `${basePath}?${search}` : basePath;
}

export function useUnifiedRouting() {
  const router = useRouter();

  const redirectToWorkspace = (source: LoginSource = { source: 'direct' }) => {
    router.push(buildWorkspacePath(source));
  };

  const redirectToSignIn = (source: LoginSource = { source: 'direct' }) => {
    const targetPath = buildWorkspacePath(source);
    const params = new URLSearchParams();
    params.set('redirect', targetPath);
    params.set('source', source.source);
    if (source.referralCode) {
      params.set('ref', source.referralCode);
    }

    router.push(`/sign-in?${params.toString()}`);
  };

  const redirectToAuthCallback = (source: LoginSource = { source: 'direct' }) => {
    const params = new URLSearchParams();
    params.set('redirect', buildWorkspacePath(source));
    params.set('source', source.source);
    if (source.referralCode) {
      params.set('ref', source.referralCode);
    }

    router.push(`/auth-callback?${params.toString()}`);
  };

  return {
    redirectToWorkspace,
    redirectToSignIn,
    redirectToAuthCallback,
  };
}

// Helper function to get login source from URL params
export function getLoginSource(searchParams: URLSearchParams): LoginSource {
  const source = (searchParams.get('source') as LoginSource['source']) || 'direct';
  const videoId = searchParams.get('videoId') || undefined;
  const referralCode = searchParams.get('ref') || undefined;

  return { source, videoId, referralCode };
}

export function getWorkspacePath(source: LoginSource = { source: 'direct' }): string {
  return buildWorkspacePath(source);
}
