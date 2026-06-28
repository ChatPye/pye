import type { VideoRecord } from '@/lib/db/video-types';

/** Strip heavy fields before sending video records to the browser. */
export function sanitizeVideoForClient(video: VideoRecord | null): VideoRecord | null {
  if (!video) return null;

  const transcript = video.transcript;
  const trimmedTranscript =
    Array.isArray(transcript) && transcript.length > 400
      ? transcript.slice(0, 400)
      : transcript;

  return {
    ...video,
    embeddings: undefined,
    transcript: trimmedTranscript,
  };
}
