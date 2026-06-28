'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowUpRight, Award, Brain, Loader2, Share2 } from 'lucide-react';

type CompetencyItem = {
  id: string;
  name: string;
  level: string;
  progress: number;
  evidence?: string;
};

export default function CompetenciesPage() {
  const [items, setItems] = useState<CompetencyItem[]>([]);
  const [publicSlug, setPublicSlug] = useState('demo');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let ignore = false;
    (async () => {
      try {
        const res = await fetch('/api/competencies');
        if (!res.ok) return;
        const data = await res.json();
        if (ignore) return;
        if (data.success && Array.isArray(data.competencies)) {
          setItems(data.competencies);
        }
        if (typeof data.publicSlug === 'string') {
          setPublicSlug(data.publicSlug);
        }
      } catch {
        // keep empty state
      } finally {
        if (!ignore) setLoading(false);
      }
    })();
    return () => {
      ignore = true;
    };
  }, []);

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="mx-auto max-w-4xl px-6 py-12">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold">My competencies</h1>
            <p className="mt-1 text-sm text-zinc-400">
              Skills verified through your learning — share your profile with HR or your manager.
            </p>
          </div>
          <Link
            href={`/p/${publicSlug}`}
            className="inline-flex items-center gap-2 rounded-lg border border-zinc-700 px-4 py-2 text-sm hover:border-zinc-500"
          >
            <Share2 className="h-4 w-4" />
            View public profile
            <ArrowUpRight className="h-3 w-3" />
          </Link>
        </div>

        <div className="mt-8 space-y-4">
          {loading ? (
            <div className="flex items-center gap-2 text-sm text-zinc-400">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading competencies…
            </div>
          ) : items.length === 0 ? (
            <div className="rounded-xl border border-zinc-800 bg-zinc-950/80 p-8 text-center">
              <Brain className="mx-auto h-8 w-8 text-zinc-600" />
              <p className="mt-3 text-sm text-zinc-400">
                No competencies yet. Finish processing a video and chat about it — skills will appear here automatically.
              </p>
              <Link href="/workspace" className="mt-4 inline-block text-sm text-blue-400 hover:text-blue-300">
                Go to workspace
              </Link>
            </div>
          ) : (
            items.map((item) => (
              <div key={item.id} className="rounded-xl border border-zinc-800 bg-zinc-950/80 p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <Brain className="mt-0.5 h-5 w-5 text-zinc-500" />
                    <div>
                      <h2 className="font-medium">{item.name}</h2>
                      <p className="text-xs capitalize text-zinc-500">{item.level}</p>
                      {item.evidence && (
                        <p className="mt-1 text-sm text-zinc-400">{item.evidence}</p>
                      )}
                    </div>
                  </div>
                  <span className="font-mono text-sm text-zinc-300">{item.progress}%</span>
                </div>
                <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-zinc-800">
                  <div
                    className="h-full rounded-full bg-white transition-all"
                    style={{ width: `${item.progress}%` }}
                  />
                </div>
              </div>
            ))
          )}
        </div>

        <div className="mt-10 rounded-xl border border-zinc-800 bg-zinc-900/40 p-6">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Award className="h-4 w-4 text-zinc-400" />
            Certificates
          </div>
          <p className="mt-2 text-sm text-zinc-400">
            Complete assigned courses to earn certificates with shareable public links.
          </p>
          <Link href="/workspace" className="mt-4 inline-block text-sm text-blue-400 hover:text-blue-300">
            Continue learning in workspace
          </Link>
        </div>
      </div>
    </div>
  );
}
