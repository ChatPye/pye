'use client';

import { useEffect, useState } from 'react';
import { Bell, X } from 'lucide-react';
import { NotificationService } from '@/lib/notifications';

type Props = {
  enabled?: boolean;
  videoId?: string;
};

const DISMISS_KEY = 'chatpye_notification_prompt_dismissed';

export default function NotificationPrompt({ enabled = true, videoId }: Props) {
  const [visible, setVisible] = useState(false);
  const [requesting, setRequesting] = useState(false);

  useEffect(() => {
    if (!enabled || !NotificationService.getSupported()) return;
    if (NotificationService.getPermission() === 'granted') return;
    if (NotificationService.getPermission() === 'denied') return;
    if (typeof window !== 'undefined' && sessionStorage.getItem(DISMISS_KEY)) return;

    const timer = setTimeout(() => setVisible(true), 1500);
    return () => clearTimeout(timer);
  }, [enabled, videoId]);

  const handleEnable = async () => {
    setRequesting(true);
    const granted = await NotificationService.requestPermission();
    setRequesting(false);
    if (granted) {
      setVisible(false);
    }
  };

  const handleDismiss = () => {
    sessionStorage.setItem(DISMISS_KEY, '1');
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 max-w-sm animate-in slide-in-from-bottom-4">
      <div className="rounded-2xl border border-emerald-500/30 bg-zinc-950/95 p-4 shadow-2xl backdrop-blur">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/15">
            <Bell className="h-5 w-5 text-emerald-400" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-white">Get notified when ready</p>
            <p className="mt-1 text-xs text-zinc-400">
              We&apos;ll ping you when processing finishes so you can switch tabs freely.
            </p>
            <div className="mt-3 flex gap-2">
              <button
                type="button"
                onClick={handleEnable}
                disabled={requesting}
                className="rounded-lg bg-emerald-500 px-3 py-1.5 text-xs font-semibold text-black hover:bg-emerald-400 disabled:opacity-50"
              >
                {requesting ? 'Enabling…' : 'Enable notifications'}
              </button>
              <button
                type="button"
                onClick={handleDismiss}
                className="rounded-lg border border-zinc-700 px-3 py-1.5 text-xs text-zinc-400 hover:text-white"
              >
                Not now
              </button>
            </div>
          </div>
          <button
            type="button"
            onClick={handleDismiss}
            className="text-zinc-500 hover:text-zinc-300"
            aria-label="Dismiss"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
