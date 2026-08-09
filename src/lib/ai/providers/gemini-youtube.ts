import type { StructuredAnalysisRequest } from '@/lib/ai/types';
import type { ResourceAnalysis } from '@/lib/ai/schemas/resource-analysis';
import { analyseResourceStructured, askPyeYoutube } from '@/lib/ai/router';

export type GeminiYouTubeChatRequest = {
  youtubeUrl: string;
  question: string;
  tutorInstructions: string;
  transcriptContext?: string;
  organisationId?: string;
  userId?: string;
  resourceId?: string;
};

/** Thin facade — delegates to @chatpye platform router. */
export class GeminiYouTubeProvider {
  readonly name = 'gemini' as const;

  async analyseStructured(request: StructuredAnalysisRequest): Promise<{
    analysis: ResourceAnalysis;
    metrics: { provider: string; model: string; latencyMs: number };
  }> {
    return analyseResourceStructured(request);
  }

  async chat(request: GeminiYouTubeChatRequest) {
    return askPyeYoutube(request);
  }
}

export const geminiYouTubeProvider = new GeminiYouTubeProvider();

/** @deprecated Use geminiYouTubeProvider */
export const geminiVideoAnalysisProvider = geminiYouTubeProvider;
