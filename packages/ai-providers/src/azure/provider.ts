import { USER_SAFE_FALLBACK, type AiProvider, type AiRequest, type AiResult } from '@chatpye/ai-core';

/** Azure AI Foundry stub — interface complete; live credentials not required for MVP. */
export class AzureFoundryProvider implements AiProvider {
  readonly id = 'azure_foundry' as const;

  supports(capability: string): boolean {
    return capability.startsWith('agent.');
  }

  async healthCheck(): Promise<{ healthy: boolean; detail?: string }> {
    return { healthy: false, detail: 'AZURE_FOUNDRY_NOT_CONFIGURED' };
  }

  async invoke<T>(_request: AiRequest): Promise<AiResult<T>> {
    return {
      ok: false,
      userMessage: USER_SAFE_FALLBACK,
      code: 'AZURE_FOUNDRY_STUB',
      retryable: false,
      provider: 'azure_foundry',
    };
  }
}
