import { YoutubeTranscript } from '@danielxceron/youtube-transcript';
import { logger } from '@/lib/logger';
import { youtubeWatchUrl } from '@/lib/youtube';

export interface TranscriptSegment {
  text: string;
  start: number;
  duration: number;
}

function extractJsonArray(value: string): unknown[] | null {
  const fenced = value.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1] || value;
  const start = fenced.indexOf('[');
  const end = fenced.lastIndexOf(']');
  if (start < 0 || end < start) return null;
  try {
    const parsed = JSON.parse(fenced.slice(start, end + 1));
    return Array.isArray(parsed) ? parsed : null;
  } catch { return null; }
}

/** Gemini Interactions may return output_text or text nested in steps/content. */
function extractGeminiText(body: Record<string, unknown>): string {
  if (typeof body.output_text === 'string') return body.output_text;

  const pieces: string[] = [];
  const visit = (value: unknown): void => {
    if (!value) return;
    if (typeof value === 'string') {
      pieces.push(value);
      return;
    }
    if (Array.isArray(value)) {
      value.forEach(visit);
      return;
    }
    if (typeof value === 'object') {
      const record = value as Record<string, unknown>;
      if (typeof record.text === 'string') pieces.push(record.text);
      // Only walk response-bearing fields; avoid stringifying metadata into the result.
      for (const key of ['output', 'steps', 'content', 'parts', 'candidates']) visit(record[key]);
    }
  };
  visit(body);
  return pieces.join('\n');
}

/** Keep downstream chaptering and chat stable even when an AI response is imperfect. */
function normaliseTranscript(segments: TranscriptSegment[]): TranscriptSegment[] {
  const seen = new Set<string>();
  return segments
    .filter((segment) => segment.text.length > 0 && Number.isFinite(segment.start))
    .map((segment) => ({
      text: segment.text.replace(/\s+/g, ' ').trim(),
      start: Math.max(0, Math.round(segment.start * 10) / 10),
      duration: Math.min(90, Math.max(1, Math.round((Number.isFinite(segment.duration) ? segment.duration : 5) * 10) / 10)),
    }))
    .sort((a, b) => a.start - b.start)
    .filter((segment) => {
      const key = `${segment.start}:${segment.text.toLowerCase()}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

/** Gemini fallback for public YouTube videos without published captions. */
async function fetchGeminiYouTubeTranscript(videoId: string): Promise<TranscriptSegment[] | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  try {
    const response = await fetch('https://generativelanguage.googleapis.com/v1beta/interactions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
      body: JSON.stringify({
        model: process.env.GEMINI_VIDEO_MODEL || 'gemini-3.6-flash',
        input: [
          { type: 'video', uri: youtubeWatchUrl(videoId) },
          { type: 'text', text: 'Analyse this public tutorial using both the spoken and visible content. Return only a valid JSON array: [{"text":"clear spoken or visible instruction","start":number of seconds,"duration":number of seconds}]. Use chronological, accurate timestamps; keep each segment focused (2–30 seconds); include visible code, formulas or UI actions when useful; do not invent timestamps.' },
        ],
      }),
    });
    if (!response.ok) throw new Error(`Gemini returned ${response.status}`);
    const body = await response.json() as Record<string, unknown>;
    const output = extractGeminiText(body);
    const entries = extractJsonArray(output);
    const segments = normaliseTranscript((entries ?? []).map((entry) => {
      const item = entry as Record<string, unknown>;
      return { text: String(item.text ?? '').trim(), start: Number(item.start ?? 0), duration: Number(item.duration ?? 5) };
    }));
    return segments.length ? segments : null;
  } catch (error) {
    logger.warn('Gemini YouTube analysis failed', { videoId, error: error instanceof Error ? error.message : String(error) });
    return null;
  }
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

  // Method 4: Gemini understands the public video itself, including visual steps.
  const geminiTranscript = await fetchGeminiYouTubeTranscript(videoId);
  if (geminiTranscript?.length) {
    logger.info('YouTube transcript generated with Gemini', { videoId, segmentCount: geminiTranscript.length });
    return geminiTranscript;
  }

  logger.error('All YouTube transcript methods failed', 
    new Error('Transcript unavailable'),
    { videoId }
  );
  
  return null;
}
