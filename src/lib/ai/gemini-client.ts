import { extractGeminiText } from '@/lib/video/transcript';

export type GeminiInteractionInput =
  | { type: 'text'; text: string }
  | { type: 'video'; uri: string; mime_type?: string };

export function geminiModelId(): string {
  return (
    process.env.GEMINI_CHAT_MODEL ||
    process.env.GEMINI_VIDEO_MODEL ||
    'gemini-2.5-flash'
  );
}

export function isGeminiYouTubeEnabled(): boolean {
  return process.env.FEATURE_GEMINI_YOUTUBE !== 'false' && Boolean(process.env.GEMINI_API_KEY);
}

export async function createGeminiInteraction(
  input: GeminiInteractionInput[],
  model = geminiModelId(),
): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured');
  }

  const response = await fetch('https://generativelanguage.googleapis.com/v1beta/interactions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': apiKey,
    },
    body: JSON.stringify({ model, input }),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    throw new Error(`Gemini request failed (${response.status})${detail ? `: ${detail.slice(0, 200)}` : ''}`);
  }

  const body = (await response.json()) as Record<string, unknown>;
  const text = extractGeminiText(body).trim();
  if (!text) {
    throw new Error('Gemini returned an empty response');
  }
  return text;
}
