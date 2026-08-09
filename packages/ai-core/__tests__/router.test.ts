import {
  AiRouter,
  resetProviderHealthForTests,
  isCircuitOpen,
  recordProviderFailure,
  recordProviderSuccess,
} from '../src/router.js';
import type { AiProvider, AiProviderId, RoutingContext } from '../src/provider.js';

describe('AiRouter', () => {
  beforeEach(() => resetProviderHealthForTests());

  it('routes YouTube tutor chat to Gemini first', async () => {
    const calls: AiProviderId[] = [];
    const router = new AiRouter({
      providers: [
        {
          id: 'gemini',
          supports: (c, s) => c === 'video.tutor_chat' && s === 'youtube',
          healthCheck: async () => ({ healthy: true }),
          invoke: (async () => {
            calls.push('gemini');
            return {
              ok: true,
              data: { answer: 'ok' },
              provider: 'gemini',
              model: 'gemini-test',
              promptVersion: 'test',
              usage: { latencyMs: 1 },
              sourceReferences: [],
            };
          }) as AiProvider['invoke'],
        },
        {
          id: 'bedrock',
          supports: () => true,
          healthCheck: async () => ({ healthy: true }),
          invoke: (async () => {
            calls.push('bedrock');
            return {
              ok: true,
              data: {},
              provider: 'bedrock',
              model: 'claude-test',
              promptVersion: 'test',
              usage: { latencyMs: 1 },
              sourceReferences: [],
            };
          }) as AiProvider['invoke'],
        },
      ],
    });

    const ctx: RoutingContext = {
      environment: 'staging',
      capability: 'video.tutor_chat',
      sourceType: 'youtube',
    };

    const result = await router.route(ctx, {
      capability: 'video.tutor_chat',
      sourceType: 'youtube',
      sourceRef: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      messages: [{ role: 'user', content: 'Explain the intro' }],
    });

    expect(result.ok).toBe(true);
    expect(calls[0]).toBe('gemini');
  });

  it('opens circuit after repeated failures', () => {
    for (let i = 0; i < 5; i += 1) recordProviderFailure('gemini', 'quota');
    expect(isCircuitOpen('gemini')).toBe(true);
    recordProviderSuccess('gemini');
    expect(isCircuitOpen('gemini')).toBe(false);
  });
});
