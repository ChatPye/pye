'use client';

import { useEffect, useMemo, useState } from 'react';
import { Bell, BookOpen, Loader2, Sparkles } from 'lucide-react';
import { LEARNING_QUOTES, pickLearningQuote } from '@/lib/learning-quotes';
import {
  getUploadStageLabel,
  getProcessingStatusLabel,
  PROCESSING_STEPS,
  stepIndexForStatus,
  type ProcessingStatus,
} from '@/lib/processing-labels';

type Mode = 'upload' | 'processing';

type Props = {
  mode: Mode;
  progress: number;
  stage?: string;
  processingStatus?: ProcessingStatus | string;
  videoId?: string;
  compact?: boolean;
  className?: string;
};

export default function LearningSetupExperience({
  mode,
  progress,
  stage = 'uploading',
  processingStatus,
  videoId,
  compact = false,
  className = '',
}: Props) {
  const pct = Math.min(100, Math.max(0, Math.round(progress)));
  const [quoteIndex, setQuoteIndex] = useState(0);

  const primaryQuote = useMemo(
    () => pickLearningQuote(videoId || stage || 'setup'),
    [videoId, stage]
  );

  useEffect(() => {
    const timer = setInterval(() => {
      setQuoteIndex((i) => (i + 1) % LEARNING_QUOTES.length);
    }, 8000);
    return () => clearInterval(timer);
  }, []);

  const rotatingQuote = LEARNING_QUOTES[quoteIndex];
  const headline =
    mode === 'upload'
      ? getUploadStageLabel(stage, pct)
      : getProcessingStatusLabel(processingStatus, pct);

  const activeStep = stepIndexForStatus(processingStatus);

  if (compact) {
    return (
      <div className={`space-y-2 ${className}`}>
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs text-zinc-300">{headline}</p>
          <span className="font-mono text-xs text-emerald-400">{pct}%</span>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-zinc-800">
          <div
            className="h-full bg-gradient-to-r from-emerald-400 via-cyan-400 to-blue-500 transition-all duration-500"
            style={{ width: `${Math.max(pct, 4)}%` }}
          />
        </div>
        {mode === 'processing' && (
          <p className="text-[11px] text-zinc-500">
            We&apos;ll notify you when processing is done — feel free to leave this tab.
          </p>
        )}
      </div>
    );
  }

  return (
    <div
      className={`relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-950/40 p-6 ${className}`}
    >
      <div className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-emerald-500/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-10 -left-10 h-36 w-36 rounded-full bg-cyan-500/10 blur-3xl" />

      <div className="relative flex items-start gap-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-emerald-500/30 bg-emerald-500/10">
          {mode === 'upload' ? (
            <Sparkles className="h-6 w-6 animate-pulse text-emerald-300" />
          ) : (
            <Loader2 className="h-6 w-6 animate-spin text-emerald-300" />
          )}
        </div>

        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-white">{headline}</p>
          <p className="mt-1 text-xs text-zinc-400">
            {mode === 'upload'
              ? 'Your video is being secured. Processing starts automatically when upload completes.'
              : 'Queued for processing — we will notify you once your workspace is ready.'}
          </p>

          <div className="mt-4 flex items-center gap-3">
            <div className="h-2 flex-1 overflow-hidden rounded-full bg-zinc-800/80">
              <div
                className="h-full rounded-full bg-gradient-to-r from-emerald-400 via-cyan-400 to-blue-500 transition-all duration-500 ease-out"
                style={{ width: `${Math.max(pct, 3)}%` }}
              />
            </div>
            <span className="font-mono text-sm font-semibold tabular-nums text-emerald-300">
              {pct}%
            </span>
          </div>

          {mode === 'processing' && (
            <>
              <div className="mt-4 grid grid-cols-4 gap-2">
                {PROCESSING_STEPS.map((step, index) => {
                  const done = activeStep > index;
                  const active = activeStep === index;
                  return (
                    <div key={step.key} className="text-center">
                      <div
                        className={`mx-auto mb-1 h-2 w-2 rounded-full transition-colors ${
                          done
                            ? 'bg-emerald-400'
                            : active
                              ? 'bg-cyan-400 animate-pulse'
                              : 'bg-zinc-700'
                        }`}
                      />
                      <span
                        className={`text-[10px] ${
                          done || active ? 'text-zinc-300' : 'text-zinc-600'
                        }`}
                      >
                        {step.label}
                      </span>
                    </div>
                  );
                })}
              </div>

              <div className="mt-4 flex items-center gap-2 rounded-lg border border-white/5 bg-black/20 px-3 py-2 text-[11px] text-zinc-400">
                <Bell className="h-3.5 w-3.5 shrink-0 text-amber-400/80" />
                <span>We&apos;ll notify you when processing is done — you can safely switch tabs.</span>
              </div>
            </>
          )}
        </div>
      </div>

      <div className="relative mt-5 rounded-xl border border-white/5 bg-black/25 p-4">
        <div className="mb-2 flex items-center gap-2 text-[11px] uppercase tracking-wider text-zinc-500">
          <BookOpen className="h-3.5 w-3.5" />
          While you wait
        </div>
        <blockquote className="text-sm leading-relaxed text-zinc-200 transition-opacity duration-700">
          &ldquo;{rotatingQuote.text}&rdquo;
        </blockquote>
        <p className="mt-2 text-xs text-zinc-500">— {rotatingQuote.author}</p>
        {!compact && primaryQuote.text !== rotatingQuote.text && (
          <p className="mt-3 border-t border-white/5 pt-3 text-[11px] italic text-zinc-600">
            Selected for you: &ldquo;{primaryQuote.text.slice(0, 80)}
            {primaryQuote.text.length > 80 ? '…' : ''}&rdquo;
          </p>
        )}
      </div>
    </div>
  );
}
