import { AzureFoundryProvider } from '../src/azure/provider.js';
import { VertexProvider } from '../src/vertex/provider.js';

describe('multi-cloud provider stubs', () => {
  it('azure stub returns safe fallback', async () => {
    const provider = new AzureFoundryProvider();
    expect(await provider.healthCheck()).toEqual({
      healthy: false,
      detail: 'AZURE_FOUNDRY_NOT_CONFIGURED',
    });
    const result = await provider.invoke({
      capability: 'agent.evidence_analysis',
      payload: {},
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe('AZURE_FOUNDRY_STUB');
  });

  it('vertex stub returns safe fallback', async () => {
    const provider = new VertexProvider();
    const result = await provider.invoke({
      capability: 'video.tutor_chat',
      sourceType: 'youtube',
      sourceRef: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      messages: [{ role: 'user', content: 'hi' }],
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe('VERTEX_STUB');
  });
});
