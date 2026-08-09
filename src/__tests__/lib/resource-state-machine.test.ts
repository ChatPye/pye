import {
  assertResourceTransition,
  canTransitionResourceState,
  isTerminalResourceState,
  isUserVisibleReadyState,
} from '@/lib/resources/state-machine';

describe('resource state machine', () => {
  it('allows happy-path transitions', () => {
    expect(canTransitionResourceState('created', 'validating')).toBe(true);
    expect(canTransitionResourceState('validating', 'queued')).toBe(true);
    expect(canTransitionResourceState('generating_learning_structure', 'ready')).toBe(true);
  });

  it('rejects invalid transitions', () => {
    expect(canTransitionResourceState('created', 'ready')).toBe(false);
    expect(() => assertResourceTransition('created', 'ready')).toThrow();
  });

  it('identifies terminal and user-visible states', () => {
    expect(isTerminalResourceState('ready')).toBe(true);
    expect(isTerminalResourceState('queued')).toBe(false);
    expect(isUserVisibleReadyState('partially_ready')).toBe(true);
  });
});
