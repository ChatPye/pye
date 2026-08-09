import {
  PROMPT_VERSION,
  USER_SAFE_FALLBACK,
  type AiProvider,
  type AiRequest,
  type AiResult,
} from '@chatpye/ai-core';

/** AWS Bedrock adapter — only place @aws-sdk/client-bedrock-runtime should be imported. */
export class BedrockProvider implements AiProvider {
  readonly id = 'bedrock' as const;

  supports(capability: string, sourceType?: string): boolean {
    if (capability.startsWith('agent.')) return true;
    if (capability === 'video.tutor_chat' && sourceType === 'video_upload') return true;
    if (capability === 'video.structured_analysis' && sourceType === 'video_upload') return true;
    return capability === 'document.analysis';
  }

  async healthCheck(): Promise<{ healthy: boolean; detail?: string }> {
    if (!process.env.AWS_REGION) return { healthy: false, detail: 'AWS_REGION_NOT_SET' };
    return { healthy: true };
  }

  async invoke<T>(request: AiRequest): Promise<AiResult<T>> {
    const started = Date.now();
    const model = process.env.BEDROCK_CHAT_MODEL || 'anthropic.claude-3-5-sonnet-20241022-v2:0';

    try {
      // Lazy import keeps Bedrock SDK out of bundles that do not need it.
      const { BedrockRuntimeClient, InvokeModelCommand } = await import('@aws-sdk/client-bedrock-runtime');
      const client = new BedrockRuntimeClient({ region: process.env.AWS_REGION || 'eu-west-2' });

      const prompt =
        request.capability === 'video.tutor_chat'
          ? request.messages.map((m) => `${m.role}: ${m.content}`).join('\n')
          : JSON.stringify(request);

      const command = new InvokeModelCommand({
        modelId: model,
        contentType: 'application/json',
        accept: 'application/json',
        body: JSON.stringify({
          anthropic_version: 'bedrock-2023-05-31',
          max_tokens: 4096,
          messages: [{ role: 'user', content: prompt }],
        }),
      });

      const response = await client.send(command);
      const decoded = JSON.parse(new TextDecoder().decode(response.body));
      const text =
        decoded.content?.[0]?.text ??
        decoded.output_text ??
        JSON.stringify(decoded);

      return {
        ok: true,
        data: { content: text } as T,
        provider: 'bedrock',
        model,
        promptVersion: PROMPT_VERSION,
        usage: { latencyMs: Date.now() - started },
        sourceReferences: [],
      };
    } catch (error) {
      return {
        ok: false,
        userMessage: USER_SAFE_FALLBACK,
        code: error instanceof Error ? error.message : 'BEDROCK_ERROR',
        retryable: true,
        provider: 'bedrock',
      };
    }
  }
}
