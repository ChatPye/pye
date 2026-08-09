import { AiRouter } from '@chatpye/ai-core';
import { BedrockProvider } from './bedrock/provider.js';
import { GeminiProvider } from './gemini/provider.js';
import { AzureFoundryProvider } from './azure/provider.js';
import { VertexProvider } from './vertex/provider.js';

export { GeminiProvider } from './gemini/provider.js';
export { BedrockProvider } from './bedrock/provider.js';
export { AzureFoundryProvider } from './azure/provider.js';
export { VertexProvider } from './vertex/provider.js';

export function createDefaultAiRouter(): AiRouter {
  return new AiRouter({
    providers: [
      new GeminiProvider(),
      new BedrockProvider(),
      new AzureFoundryProvider(),
      new VertexProvider(),
    ],
  });
}
