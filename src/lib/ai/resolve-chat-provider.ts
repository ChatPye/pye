import { extractYouTubeVideoId } from '@/lib/youtube';
import { isUploadVideoId } from '@/lib/video-upload-utils';
import type { VideoRecord } from '@/lib/db/video-types';

export type ChatProviderStrategy = 'gemini-youtube' | 'bedrock-upload';

export function resolveChatProvider(input: {
  videoId?: string;
  videoRecord?: VideoRecord | null;
}): ChatProviderStrategy {
  const { videoId, videoRecord } = input;

  if (videoId && isUploadVideoId(videoId)) {
    return 'bedrock-upload';
  }

  const source = videoRecord?.source?.toLowerCase();
  if (source === 'upload' || source === 'video_upload') {
    return 'bedrock-upload';
  }

  if (source === 'youtube' || videoRecord?.source === 'youtube') {
    return 'gemini-youtube';
  }

  if (videoId) {
    if (extractYouTubeVideoId(videoId) || /^[A-Za-z0-9_-]{11}$/.test(videoId)) {
      return 'gemini-youtube';
    }
  }

  return 'bedrock-upload';
}

export function resolveYouTubeWatchUrl(input: {
  videoId?: string;
  videoRecord?: VideoRecord | null;
}): string | null {
  const { videoId, videoRecord } = input;
  const candidates = [
    videoRecord?.videoUrl,
    videoId,
  ].filter(Boolean) as string[];

  for (const candidate of candidates) {
    const id = extractYouTubeVideoId(candidate) ?? (/^[A-Za-z0-9_-]{11}$/.test(candidate) ? candidate : null);
    if (id) {
      return `https://www.youtube.com/watch?v=${encodeURIComponent(id)}`;
    }
  }
  return null;
}
