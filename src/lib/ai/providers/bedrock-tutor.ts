import type { TutorProvider, TutorRequest, TutorResponse } from '@/lib/ai/types';

/**
 * Bedrock tutor adapter — delegates to existing chat pipeline in Milestone 1 follow-up.
 * This boundary prevents product code from importing Bedrock SDK directly.
 */
export class BedrockTutorProvider implements TutorProvider {
  readonly name = 'bedrock' as const;

  async chat(request: TutorRequest): Promise<TutorResponse> {
    const started = Date.now();
    const model = process.env.BEDROCK_CHAT_MODEL || 'anthropic.claude-3-5-sonnet-20241022-v2:0';

    // Milestone 1: wire to src/app/api/chat route internals / bedrock-invoke
    const lastUser = [...request.messages].reverse().find((m) => m.role === 'user');
    const content =
      lastUser?.content ??
      'Explain the key learning objective from the provided resource context.';

    return {
      content:
        'Bedrock tutor adapter is initialised. Connect this provider to the existing RAG chat service in the next M1 slice.',
      citations: [],
      metrics: {
        provider: 'bedrock',
        model,
        latencyMs: Date.now() - started,
      },
    };
  }
}

export const bedrockTutorProvider = new BedrockTutorProvider();
