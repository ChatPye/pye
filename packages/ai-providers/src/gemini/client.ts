/** Gemini HTTP client — isolated from product code. */

export function geminiModel(): string {
  return process.env.GEMINI_CHAT_MODEL || process.env.GEMINI_VIDEO_MODEL || 'gemini-2.5-flash';
}

export function geminiEnabled(): boolean {
  return process.env.FEATURE_GEMINI_YOUTUBE !== 'false' && Boolean(process.env.GEMINI_API_KEY);
}

export async function geminiInteract(
  input: Array<{ type: string; text?: string; uri?: string }>,
): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_NOT_CONFIGURED');

  const response = await fetch('https://generativelanguage.googleapis.com/v1beta/interactions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
    body: JSON.stringify({ model: geminiModel(), input }),
  });

  if (!response.ok) {
    throw new Error(`GEMINI_HTTP_${response.status}`);
  }

  const body = (await response.json()) as Record<string, unknown>;
  return extractText(body);
}

function extractText(body: Record<string, unknown>): string {
  if (typeof body.output_text === 'string') return body.output_text;
  const parts: string[] = [];
  const visit = (v: unknown): void => {
    if (!v) return;
    if (typeof v === 'string') {
      parts.push(v);
      return;
    }
    if (Array.isArray(v)) {
      v.forEach(visit);
      return;
    }
    if (typeof v === 'object') {
      const r = v as Record<string, unknown>;
      if (typeof r.text === 'string') parts.push(r.text);
      for (const k of ['output', 'steps', 'content', 'parts']) visit(r[k]);
    }
  };
  visit(body);
  const text = parts.join('\n').trim();
  if (!text) throw new Error('GEMINI_EMPTY_RESPONSE');
  return text;
}

export function youtubeWatchUrl(videoId: string): string {
  return `https://www.youtube.com/watch?v=${encodeURIComponent(videoId)}`;
}

export function extractYouTubeId(value: string): string | null {
  const trimmed = value.trim();
  if (/^[A-Za-z0-9_-]{11}$/.test(trimmed)) return trimmed;
  try {
    const url = new URL(trimmed.startsWith('http') ? trimmed : `https://${trimmed}`);
    if (url.hostname.includes('youtu.be')) {
      const id = url.pathname.split('/').filter(Boolean)[0];
      return id && /^[A-Za-z0-9_-]{11}$/.test(id) ? id : null;
    }
    const v = url.searchParams.get('v');
    return v && /^[A-Za-z0-9_-]{11}$/.test(v) ? v : null;
  } catch {
    return null;
  }
}
