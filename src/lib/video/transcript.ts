import { YoutubeTranscript } from '@danielxceron/youtube-transcript';
import { logger } from '@/lib/logger';

export interface TranscriptSegment {
  text: string;
  start: number;
  duration: number;
}

/**
 * Fetch YouTube transcript with multiple fallback methods
 */
export async function fetchYouTubeTranscript(videoId: string): Promise<TranscriptSegment[] | null> {
  // Method 1: Try @danielxceron/youtube-transcript (primary method)
  try {
    logger.info('Fetching YouTube transcript', { videoId, method: 'youtube-transcript' });
    const segments = await YoutubeTranscript.fetchTranscript(videoId, {
      lang: 'en',
    });

    if (segments && segments.length > 0) {
      const formatted = segments.map((segment: any) => ({
        text: segment.text,
        start: segment.offset / 1000, // Convert ms to seconds
        duration: segment.duration / 1000,
      }));
      
      logger.info('YouTube transcript fetched successfully', { 
        videoId, 
        segmentCount: formatted.length 
      });
      return formatted;
    }
  } catch (error) {
    logger.warn('YouTube transcript fetch failed (method 1)', {
      videoId,
      error: error instanceof Error ? error.message : String(error),
    });
  }

  // Method 2: Try YouTube timedtext API
  try {
    logger.info('Trying YouTube timedtext API', { videoId, method: 'timedtext-api' });
    const timedTextUrl = `https://www.youtube.com/api/timedtext?fmt=json3&lang=en&v=${videoId}`;
    const response = await fetch(timedTextUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    });

    if (response.ok) {
      const data = await response.json();
      const events = data?.events || [];
      
      if (Array.isArray(events) && events.length > 0) {
        const formatted = events
          .filter((event: any) => Array.isArray(event?.segs))
          .map((event: any) => ({
            text: event.segs.map((seg: any) => seg.utf8 || seg.text || '').join(''),
            start: (event.tStartMs || 0) / 1000,
            duration: (event.dDurationMs || 2000) / 1000,
          }))
          .filter((seg: TranscriptSegment) => seg.text.length > 0);

        if (formatted.length > 0) {
          logger.info('YouTube transcript fetched via timedtext API', { 
            videoId, 
            segmentCount: formatted.length 
          });
          return formatted;
        }
      }
    }
  } catch (error) {
    logger.warn('YouTube timedtext API failed', {
      videoId,
      error: error instanceof Error ? error.message : String(error),
    });
  }

  // Method 3: Try alternative timedtext endpoint
  try {
    const altUrl = `https://video.google.com/timedtext?fmt=json3&lang=en&v=${videoId}`;
    const response = await fetch(altUrl);

    if (response.ok) {
      const data = await response.json();
      const events = data?.events || [];
      
      if (Array.isArray(events) && events.length > 0) {
        const formatted = events
          .filter((event: any) => Array.isArray(event?.segs))
          .map((event: any) => ({
            text: event.segs.map((seg: any) => seg.utf8 || seg.text || '').join(''),
            start: (event.tStartMs || 0) / 1000,
            duration: (event.dDurationMs || 2000) / 1000,
          }))
          .filter((seg: TranscriptSegment) => seg.text.length > 0);

        if (formatted.length > 0) {
          logger.info('YouTube transcript fetched via alternative endpoint', { 
            videoId, 
            segmentCount: formatted.length 
          });
          return formatted;
        }
      }
    }
  } catch (error) {
    logger.warn('Alternative transcript endpoint failed', {
      videoId,
      error: error instanceof Error ? error.message : String(error),
    });
  }

  logger.error('All YouTube transcript methods failed', 
    new Error('Transcript unavailable'),
    { videoId }
  );
  
  return null;
}
