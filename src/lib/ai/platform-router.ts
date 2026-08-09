import { createDefaultAiRouter } from '@chatpye/ai-providers';
import type { AiRouter, RoutingContext } from '@chatpye/ai-core';

let router: AiRouter | null = null;

export function getPlatformAiRouter(): AiRouter {
  if (!router) {
    router = createDefaultAiRouter();
  }
  return router;
}

export function resolveChatpyeEnvironment(): RoutingContext['environment'] {
  const env = process.env.CHATPYE_ENV ?? process.env.NODE_ENV;
  if (env === 'production') return 'production';
  if (env === 'staging') return 'staging';
  if (env === 'preview') return 'preview';
  return 'local';
}

/** Reset singleton — tests only. */
export function resetPlatformAiRouterForTests(): void {
  router = null;
}
