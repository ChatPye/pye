import type { ResourceProcessingState } from '@/lib/resources/types';

const TRANSITIONS: Record<ResourceProcessingState, ResourceProcessingState[]> = {
  created: ['validating', 'deleted'],
  validating: ['queued', 'failed', 'deleted'],
  queued: ['processing_metadata', 'failed', 'deleted'],
  processing_metadata: ['analysing_content', 'failed', 'deleted'],
  analysing_content: ['generating_learning_structure', 'partially_ready', 'failed', 'deleted'],
  generating_learning_structure: ['ready', 'partially_ready', 'failed', 'deleted'],
  ready: ['deleted'],
  partially_ready: ['generating_learning_structure', 'ready', 'failed', 'deleted'],
  failed: ['queued', 'deleted'],
  deleted: [],
};

export function canTransitionResourceState(
  from: ResourceProcessingState,
  to: ResourceProcessingState,
): boolean {
  if (from === to) return true;
  return TRANSITIONS[from]?.includes(to) ?? false;
}

export function assertResourceTransition(
  from: ResourceProcessingState,
  to: ResourceProcessingState,
): void {
  if (!canTransitionResourceState(from, to)) {
    throw new Error(`Invalid resource state transition: ${from} → ${to}`);
  }
}

export function isTerminalResourceState(state: ResourceProcessingState): boolean {
  return state === 'ready' || state === 'failed' || state === 'deleted';
}

export function isUserVisibleReadyState(state: ResourceProcessingState): boolean {
  return state === 'ready' || state === 'partially_ready';
}
