import { USER_SAFE_FALLBACK, type AiProvider, type AiRequest, type AiResult } from '@chatpye/ai-core';

/** Google Vertex AI stub — multi-cloud expansion point. */
export class VertexProvider implements AiProvider {
  readonly id = 'vertex' as const;

  supports(capability: string, sourceType?: string): boolean {
    return (
      (capability === 'video.structured_analysis' || capability === 'video.tutor_chat') &&
      sourceType === 'youtube'
    );
  }

  async healthCheck(): Promise<{ healthy: boolean; detail?: string }> {
    return { healthy: false, detail: 'VERTEX_NOT_CONFIGURED' };
  }

  async invoke<T>(_request: AiRequest): Promise<AiResult<T>> {
    return {
      ok: false,
      userMessage: USER_SAFE_FALLBACK,
      code: 'VERTEX_STUB',
      retryable: false,
      provider: 'vertex',
    };
  }
}
