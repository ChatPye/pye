import type { ResourceAnalysis } from '@/lib/ai/schemas/resource-analysis';

export type AiProviderName = 'gemini' | 'bedrock';

export type AiUsageMetrics = {
  provider: string;
  model: string;
  inputTokens?: number;
  outputTokens?: number;
  latencyMs: number;
  estimatedCostUsd?: number;
};

export type StructuredAnalysisRequest = {
  sourceType: 'youtube' | 'pdf' | 'web_url' | 'video_upload';
  sourceRef: string;
  titleHint?: string;
  organisationId?: string;
  userId?: string;
};

export type TutorMessage = {
  role: 'user' | 'assistant' | 'system';
  content: string;
};

export type TutorRequest = {
  messages: TutorMessage[];
  resourceContext: string;
  taskContext?: string;
};

export type TutorResponse = {
  content: string;
  citations?: Array<{ label: string; ref: string }>;
  metrics: AiUsageMetrics;
};

export interface VideoAnalysisProvider {
  readonly name: AiProviderName;
  analyseStructured(request: StructuredAnalysisRequest): Promise<{
    analysis: ResourceAnalysis;
    metrics: AiUsageMetrics;
  }>;
}

export interface TutorProvider {
  readonly name: AiProviderName;
  chat(request: TutorRequest): Promise<TutorResponse>;
}
