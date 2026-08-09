import {
  USER_SAFE_FALLBACK,
  type ResourceAnalysis,
  type RoutingContext,
} from '@chatpye/ai-core';
import { getPlatformAiRouter, resolveChatpyeEnvironment } from '@/lib/ai/platform-router';
import { persistRoutedAiCall } from '@/lib/db/ai-job-repository';
import {
  resolveChatProvider,
  resolveYouTubeWatchUrl,
  type ChatProviderStrategy,
} from '@/lib/ai/resolve-chat-provider';
import type { StructuredAnalysisRequest, TutorRequest, AiUsageMetrics } from '@/lib/ai/types';
import type { VideoRecord } from '@/lib/db/video-types';

export function resolveResourceChatStrategy(input: {
  videoId?: string;
  videoRecord?: VideoRecord | null;
}): ChatProviderStrategy {
  return resolveChatProvider(input);
}

export { resolveYouTubeWatchUrl, resolveChatProvider };

export async function analyseResourceStructured(request: StructuredAnalysisRequest): Promise<{
  analysis: ResourceAnalysis;
  metrics: AiUsageMetrics;
}> {
  const router = getPlatformAiRouter();
  const ctx: RoutingContext = {
    environment: resolveChatpyeEnvironment(),
    capability: 'video.structured_analysis',
    sourceType: request.sourceType,
    organisationId: request.organisationId,
    userId: request.userId,
  };

  const result = await persistRoutedAiCall(
    {
      capability: 'video.structured_analysis',
      organisationId: request.organisationId ?? null,
      userId: request.userId ?? null,
      inputRef: { sourceType: request.sourceType, sourceRef: request.sourceRef },
    },
    () =>
      router.route<ResourceAnalysis>(ctx, {
        capability: 'video.structured_analysis',
        sourceType: request.sourceType,
        sourceRef: request.sourceRef,
        titleHint: request.titleHint,
        organisationId: request.organisationId,
        userId: request.userId,
      }),
  );

  if (!result.ok) {
    throw new Error(result.userMessage || USER_SAFE_FALLBACK);
  }

  return {
    analysis: result.data,
    metrics: {
      provider: result.provider,
      model: result.model,
      latencyMs: result.usage.latencyMs,
      inputTokens: result.usage.inputTokens,
      outputTokens: result.usage.outputTokens,
    },
  };
}

export async function askPyeYoutube(request: {
  youtubeUrl: string;
  question: string;
  tutorInstructions: string;
  transcriptContext?: string;
  organisationId?: string;
  userId?: string;
  resourceId?: string;
}): Promise<{ content: string; metrics: AiUsageMetrics }> {
  const router = getPlatformAiRouter();
  const ctx: RoutingContext = {
    environment: resolveChatpyeEnvironment(),
    capability: 'video.tutor_chat',
    sourceType: 'youtube',
    organisationId: request.organisationId,
    userId: request.userId,
  };

  const result = await persistRoutedAiCall(
    {
      capability: 'video.tutor_chat',
      organisationId: request.organisationId ?? null,
      userId: request.userId ?? null,
      resourceId: request.resourceId ?? null,
      inputRef: { sourceRef: request.youtubeUrl, questionLength: request.question.length },
    },
    () =>
      router.route<{ content: string }>(ctx, {
        capability: 'video.tutor_chat',
        sourceType: 'youtube',
        sourceRef: request.youtubeUrl,
        messages: [{ role: 'user', content: request.question }],
        contextArtefact: [request.tutorInstructions, request.transcriptContext]
          .filter(Boolean)
          .join('\n\n'),
        organisationId: request.organisationId,
        userId: request.userId,
      }),
  );

  if (!result.ok) {
    throw new Error(result.userMessage || USER_SAFE_FALLBACK);
  }

  return {
    content: result.data.content.slice(0, 12000),
    metrics: {
      provider: result.provider,
      model: result.model,
      latencyMs: result.usage.latencyMs,
      inputTokens: result.usage.inputTokens,
      outputTokens: result.usage.outputTokens,
    },
  };
}

/** @deprecated Use askPyeYoutube for YouTube or Bedrock path for uploads. */
export async function askPye(request: TutorRequest) {
  throw new Error('askPye is not wired — use askPyeYoutube or the Bedrock chat route');
}

/** @deprecated Use analyseResourceStructured via platform router. */
export function getVideoAnalysisProvider() {
  return { analyseStructured: analyseResourceStructured };
}

/** @deprecated Bedrock tutor remains in /api/chat upload path. */
export function getTutorProvider() {
  return { chat: askPye };
}
