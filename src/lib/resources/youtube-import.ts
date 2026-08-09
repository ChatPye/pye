import { extractYouTubeVideoId, youtubeWatchUrl } from '@/lib/youtube';

export type YoutubeImportInput = {
  videoId: string;
  sourceRef: string;
  url: string;
};

export function parseYoutubeImportInput(value: unknown): YoutubeImportInput {
  if (typeof value !== 'string' || !value.trim()) {
    throw new Error('YOUTUBE_URL_REQUIRED');
  }

  const videoId = extractYouTubeVideoId(value);
  if (!videoId) {
    throw new Error('INVALID_YOUTUBE_URL');
  }

  return {
    videoId,
    sourceRef: youtubeWatchUrl(videoId),
    url: youtubeWatchUrl(videoId),
  };
}

export function isGeminiYoutubeConfigured(): boolean {
  return process.env.FEATURE_GEMINI_YOUTUBE !== 'false' && Boolean(process.env.GEMINI_API_KEY);
}
