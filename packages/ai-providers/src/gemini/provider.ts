import {
  PROMPT_VERSION,
  USER_SAFE_FALLBACK,
  parseResourceAnalysis,
  type AiProvider,
  type AiRequest,
  type AiResult,
} from '@chatpye/ai-core';
import { extractYouTubeId, geminiEnabled, geminiInteract, geminiModel, youtubeWatchUrl } from './client.js';

export class GeminiProvider implements AiProvider {
  readonly id = 'gemini' as const;

  supports(capability: string, sourceType?: string): boolean {
    if (!geminiEnabled()) return false;
    if (capability === 'video.structured_analysis' || capability === 'video.tutor_chat') {
      return sourceType === 'youtube';
    }
    return false;
  }

  async healthCheck(): Promise<{ healthy: boolean; detail?: string }> {
    if (!geminiEnabled()) return { healthy: false, detail: 'GEMINI_NOT_CONFIGURED' };
    return { healthy: true };
  }

  async invoke<T>(request: AiRequest): Promise<AiResult<T>> {
    const started = Date.now();
    try {
      if (request.capability === 'video.structured_analysis') {
        const videoId = extractYouTubeId(request.sourceRef);
        if (!videoId) throw new Error('INVALID_YOUTUBE_REF');
        const text = await geminiInteract([
          { type: 'video', uri: youtubeWatchUrl(videoId) },
          {
            type: 'text',
            text: 'Return structured JSON analysis for this tutorial (title, summary, chapters, quiz, flashcards, competencyCandidates, sourceReferences). JSON only.',
          },
        ]);
        const jsonStart = text.indexOf('{');
        const jsonEnd = text.lastIndexOf('}');
        const parsed = JSON.parse(text.slice(jsonStart, jsonEnd + 1));
        const analysis = parseResourceAnalysis(parsed);
        return {
          ok: true,
          data: analysis as T,
          provider: 'gemini',
          model: geminiModel(),
          promptVersion: PROMPT_VERSION,
          usage: { latencyMs: Date.now() - started },
          sourceReferences: [{ type: 'youtube_url', label: 'YouTube', ref: youtubeWatchUrl(videoId) }],
        };
      }

      if (request.capability === 'video.tutor_chat') {
        const videoId = extractYouTubeId(request.sourceRef);
        if (!videoId) throw new Error('INVALID_YOUTUBE_REF');
        const lastUser = [...request.messages].reverse().find((m) => m.role === 'user');
        const text = await geminiInteract([
          { type: 'video', uri: youtubeWatchUrl(videoId) },
          {
            type: 'text',
            text: [
              request.contextArtefact ?? '',
              lastUser?.content ?? '',
              'Respond as Pye with [MM:SS] citations when supported.',
            ].join('\n'),
          },
        ]);
        return {
          ok: true,
          data: { content: text } as T,
          provider: 'gemini',
          model: geminiModel(),
          promptVersion: PROMPT_VERSION,
          usage: { latencyMs: Date.now() - started },
          sourceReferences: [{ type: 'youtube_url', label: 'YouTube', ref: youtubeWatchUrl(videoId) }],
        };
      }

      return {
        ok: false,
        userMessage: USER_SAFE_FALLBACK,
        code: 'GEMINI_UNSUPPORTED_CAPABILITY',
        retryable: false,
        provider: 'gemini',
      };
    } catch (error) {
      return {
        ok: false,
        userMessage: USER_SAFE_FALLBACK,
        code: error instanceof Error ? error.message : 'GEMINI_ERROR',
        retryable: true,
        provider: 'gemini',
      };
    }
  }
}
