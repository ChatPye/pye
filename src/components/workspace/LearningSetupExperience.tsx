'use client';

import { useEffect, useMemo, useState } from 'react';
import { Loader2, Upload } from 'lucide-react';
import {
  getCompactWorkspaceLabel,
  getProcessingStatusLabel,
  type ProcessingStatus,
} from '@/lib/processing-labels';

type Mode = 'upload' | 'processing';

type Props = {
  mode: Mode;
  progress: number;
  stage?: string;
  processingStatus?: ProcessingStatus | string;
  videoId?: string;
  videoPlayable?: boolean;
  compact?: boolean;
  className?: string;
};

export default function LearningSetupExperience({
  mode,
  progress,
  stage = 'uploading',
  processingStatus,
  videoPlayable = false,
  compact = true,
  className = '',
}: Props) {
  const pct = Math.min(100, Math.max(0, Math.round(progress)));

  const headline = useMemo(
    () =>
      compact
        ? getCompactWorkspaceLabel({
            mode,
            progress: pct,
            stage,
            status: processingStatus,
            videoPlayable,
          })
        : mode === 'upload'
          ? getCompactWorkspaceLabel({ mode, progress: pct, stage })
          : getProcessingStatusLabel(processingStatus, pct),
    [compact, mode, pct, stage, processingStatus, videoPlayable]
  );

  if (!compact) {
    return (
      <div className={`space-y-2 ${className}`}>
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm text-zinc-200">{headline}</p>
          <span className="font-mono text-sm text-emerald-400">{pct}%</span>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-zinc-800">
          <div
            className="h-full bg-gradient-to-r from-emerald-400 to-cyan-400 transition-all duration-500"
            style={{ width: `${Math.max(pct, 4)}%` }}
          />
        </div>
      </div>
    );
  }

  return (
    <div
      className={`flex items-center gap-3 border-b border-zinc-800/80 bg-zinc-900/90 px-4 py-2.5 ${className}`}
      role="status"
      aria-live="polite"
    >
      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10">
        {mode === 'upload' ? (
          <Upload className="h-3.5 w-3.5 text-emerald-400" />
        ) : (
          <Loader2 className="h-3.5 w-3.5 animate-spin text-emerald-400" />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-3">
          <p className="truncate text-xs text-zinc-200">{headline}</p>
          <span className="ml-auto shrink-0 font-mono text-xs tabular-nums text-emerald-400">
            {pct}%
          </span>
        </div>
        <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-zinc-800">
          <div
            className="h-full bg-gradient-to-r from-emerald-400 to-cyan-400 transition-all duration-500"
            style={{ width: `${Math.max(pct, 3)}%` }}
          />
        </div>
      </div>
    </div>
  );
}
