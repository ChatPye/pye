import {
  USER_SAFE_FALLBACK,
  type AiCapability,
  type AiProvider,
  type AiProviderId,
  type AiRequest,
  type AiResult,
  type OrganisationAiPolicy,
  type ProviderHealthState,
  type RoutingContext,
} from './provider.js';

export type RouterOptions = {
  providers: AiProvider[];
  defaultPolicy?: OrganisationAiPolicy;
  getPolicy?: (organisationId?: string) => Promise<OrganisationAiPolicy | undefined>;
  onRoute?: (event: {
    capability: AiCapability;
    chosen: AiProviderId;
    fallbacks: AiProviderId[];
    reason: string;
  }) => void;
};

const healthStates = new Map<AiProviderId, ProviderHealthState>();
const CIRCUIT_THRESHOLD = 5;
const CIRCUIT_RESET_MS = 60_000;

function defaultRouteOrder(ctx: RoutingContext): AiProviderId[] {
  if (ctx.capability === 'video.structured_analysis' || ctx.capability === 'video.tutor_chat') {
    if (ctx.sourceType === 'youtube') return ['gemini', 'bedrock'];
    if (ctx.sourceType === 'video_upload') return ['bedrock', 'gemini'];
  }
  if (ctx.capability.startsWith('agent.')) return ['bedrock', 'azure_foundry', 'vertex'];
  return ['bedrock', 'gemini'];
}

export function recordProviderFailure(provider: AiProviderId, error: string): void {
  const current = healthStates.get(provider) ?? {
    provider,
    consecutiveFailures: 0,
    circuitOpen: false,
    lastCheckedAt: new Date(),
  };
  current.consecutiveFailures += 1;
  current.lastError = error;
  current.lastCheckedAt = new Date();
  if (current.consecutiveFailures >= CIRCUIT_THRESHOLD) {
    current.circuitOpen = true;
  }
  healthStates.set(provider, current);
}

export function recordProviderSuccess(provider: AiProviderId): void {
  healthStates.set(provider, {
    provider,
    consecutiveFailures: 0,
    circuitOpen: false,
    lastCheckedAt: new Date(),
  });
}

export function isCircuitOpen(provider: AiProviderId): boolean {
  const state = healthStates.get(provider);
  if (!state?.circuitOpen) return false;
  if (Date.now() - state.lastCheckedAt.getTime() > CIRCUIT_RESET_MS) {
    state.circuitOpen = false;
    state.consecutiveFailures = 0;
    healthStates.set(provider, state);
    return false;
  }
  return true;
}

export function getProviderHealth(): ProviderHealthState[] {
  return [...healthStates.values()];
}

export function resetProviderHealthForTests(): void {
  healthStates.clear();
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function invokeWithRetry<T>(
  fn: () => Promise<AiResult<T>>,
  maxAttempts = 3,
): Promise<AiResult<T>> {
  let last: AiResult<T> | undefined;
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    last = await fn();
    if (last.ok || !last.retryable || attempt === maxAttempts) return last;
    const jitter = Math.floor(Math.random() * 250);
    await sleep(2 ** attempt * 100 + jitter);
  }
  return last ?? { ok: false, userMessage: USER_SAFE_FALLBACK, code: 'AI_UNKNOWN', retryable: false };
}

export class AiRouter {
  private readonly providers: Map<AiProviderId, AiProvider>;
  private readonly options: RouterOptions;

  constructor(options: RouterOptions) {
    this.options = options;
    this.providers = new Map(options.providers.map((p) => [p.id, p]));
  }

  async route<T>(ctx: RoutingContext, request: AiRequest): Promise<AiResult<T>> {
    const policy = (await this.options.getPolicy?.(ctx.organisationId)) ?? this.options.defaultPolicy;
    const order = defaultRouteOrder(ctx).filter((id) => {
      if (policy?.allowedProviders && !policy.allowedProviders.includes(id)) return false;
      if (policy?.blockWhenUnhealthy !== false && isCircuitOpen(id)) return false;
      return true;
    });

    if (policy?.preferProvider) {
      order.sort((a, b) => (a === policy.preferProvider ? -1 : b === policy.preferProvider ? 1 : 0));
    }

    const fallbacks: AiProviderId[] = [];
    let lastError: AiResult<T> | undefined;

    for (const providerId of order) {
      const provider = this.providers.get(providerId);
      if (!provider) continue;
      if (!provider.supports(ctx.capability, ctx.sourceType)) continue;

      fallbacks.push(providerId);
      this.options.onRoute?.({
        capability: ctx.capability,
        chosen: providerId,
        fallbacks,
        reason: `capability=${ctx.capability};source=${ctx.sourceType ?? 'n/a'}`,
      });

      const result = await invokeWithRetry(() => provider.invoke<T>(request));
      if (result.ok) {
        recordProviderSuccess(providerId);
        return result;
      }
      recordProviderFailure(providerId, result.code);
      lastError = result;
    }

    return (
      lastError ?? {
        ok: false,
        userMessage: USER_SAFE_FALLBACK,
        code: 'AI_NO_PROVIDER',
        retryable: true,
      }
    );
  }
}
