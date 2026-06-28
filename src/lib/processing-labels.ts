export type ProcessingStatus =
  | 'queued'
  | 'pending'
  | 'extracting'
  | 'transcribing'
  | 'embedding'
  | 'complete'
  | 'failed';

export function processingProgressFor(status: ProcessingStatus | string | undefined): number {
  const map: Record<string, number> = {
    queued: 8,
    pending: 12,
    extracting: 22,
    transcribing: 48,
    embedding: 72,
    complete: 100,
    failed: 0,
  };
  return map[status ?? ''] ?? 15;
}

export function getProcessingStatusLabel(
  status: ProcessingStatus | string | undefined,
  progress?: number
): string {
  const pct = progress ?? processingProgressFor(status);
  switch (status) {
    case 'queued':
      return `Queued for processing · ${pct}%`;
    case 'pending':
      return `Preparing your workspace · ${pct}%`;
    case 'extracting':
      return `Preparing media for analysis · ${pct}%`;
    case 'transcribing':
      return `Generating transcript · ${pct}%`;
    case 'embedding':
      return `Building your AI study guide · ${pct}%`;
    case 'complete':
      return 'Your workspace is ready';
    case 'failed':
      return 'Processing failed';
    default:
      return `Setting up your learning workspace · ${pct}%`;
  }
}

export function getUploadStageLabel(stage: string, progress: number): string {
  const pct = Math.round(progress);
  switch (stage) {
    case 'preparing':
      return `Uploading · ${pct}%`;
    case 'uploading':
      return `Uploading · ${pct}%`;
    case 'finalizing':
    case 'done':
      return `Finishing upload · ${pct}%`;
    default:
      return `Uploading · ${pct}%`;
  }
}

/** One-line label for the slim workspace status bar */
export function getCompactWorkspaceLabel(options: {
  mode: 'upload' | 'processing';
  progress: number;
  stage?: string;
  status?: ProcessingStatus | string;
  videoPlayable?: boolean;
}): string {
  const pct = Math.min(100, Math.max(0, Math.round(options.progress)));
  if (options.mode === 'upload') {
    return getUploadStageLabel(options.stage || 'uploading', pct);
  }
  if (options.videoPlayable && options.status !== 'complete' && options.status !== 'failed') {
    return `Video ready — play to learn · Chat preparing · ${pct}%`;
  }
  if (options.status === 'failed') {
    return 'Processing failed';
  }
  if (options.status === 'complete') {
    return 'Workspace ready';
  }
  return `Preparing workspace · ${pct}%`;
}

export const PROCESSING_STEPS = [
  { key: 'queued', label: 'Queued' },
  { key: 'extracting', label: 'Prepare media' },
  { key: 'transcribing', label: 'Transcript' },
  { key: 'embedding', label: 'Study guide' },
] as const;

export function stepIndexForStatus(status: ProcessingStatus | string | undefined): number {
  switch (status) {
    case 'queued':
    case 'pending':
      return 0;
    case 'extracting':
      return 1;
    case 'transcribing':
      return 2;
    case 'embedding':
      return 3;
    case 'complete':
      return 4;
    default:
      return 0;
  }
}
