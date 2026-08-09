import { canTransition, mapLegacyVideoProcessingStatus } from '@/lib/db/resource-repository';
import { assertResourceTransition } from '@/lib/resources/state-machine';

describe('resource repository helpers', () => {
  it('maps legacy video processing statuses', () => {
    expect(mapLegacyVideoProcessingStatus('queued')).toBe('queued');
    expect(mapLegacyVideoProcessingStatus('ready')).toBe('ready');
    expect(mapLegacyVideoProcessingStatus('failed')).toBe('failed');
    expect(mapLegacyVideoProcessingStatus('transcribing')).toBe('analysing_content');
  });

  it('allows created → validating → queued', () => {
    expect(canTransition('created', 'validating')).toBe(true);
    expect(() => assertResourceTransition('created', 'queued')).toThrow();
    expect(canTransition('validating', 'queued')).toBe(true);
  });
});
