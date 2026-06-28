'use client';

import { Tag, Rss } from 'lucide-react';
import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

export default function Insights() {
  const insightsChartData = {
    labels: ['OAuth', 'Webhooks', 'Rate limits', 'SDK'],
    datasets: [
      {
        label: 'Questions',
        data: [42, 37, 31, 24],
        backgroundColor: ['#60a5fa', '#34d399', '#fbbf24', '#a78bfa'],
      },
    ],
  };

  const insightsChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { color: '#9ca3af', font: { size: 10 } },
      },
      y: {
        grid: { color: 'rgba(255,255,255,0.08)' },
        ticks: { color: '#9ca3af', font: { size: 10 } },
        beginAtZero: true,
      },
    },
  };

  return (
    <section className="relative border-t border-zinc-800">
      <div className="mx-auto max-w-7xl px-6 py-24 lg:px-8">
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-12 items-center">
          <div className="lg:col-span-5">
            <h3 className="text-3xl sm:text-4xl font-semibold tracking-tight">Know exactly where learners struggle</h3>
            <p className="mt-4 text-lg text-zinc-400">ChatPye aggregates the real questions learners ask during training. See what topics caused drop-offs, what explanations worked, and what to fix. Build smarter training videos and tutorials every cycle.</p>
          </div>
          <div className="lg:col-span-7">
            <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-5">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium text-white">Top Questions Asked</div>
                  <div className="text-xs text-zinc-500">Last 14 days</div>
                </div>
                <span className="inline-flex items-center gap-1 rounded-md bg-blue-500/10 px-2 py-1 text-[11px] font-medium text-blue-400 border border-blue-500/20">
                  <Rss className="w-3.5 h-3.5" />
                  Live feed
                </span>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <span className="inline-flex items-center gap-2 rounded-full border border-zinc-800 bg-zinc-900/60 px-3 py-1 text-xs text-zinc-200">
                  <Tag className="w-3.5 h-3.5 text-zinc-400" />
                  OAuth errors (42)
                </span>
                <span className="inline-flex items-center gap-2 rounded-full border border-zinc-800 bg-zinc-900/60 px-3 py-1 text-xs text-zinc-200">
                  <Tag className="w-3.5 h-3.5 text-zinc-400" />
                  Webhooks (37)
                </span>
                <span className="inline-flex items-center gap-2 rounded-full border border-zinc-800 bg-zinc-900/60 px-3 py-1 text-xs text-zinc-200">
                  <Tag className="w-3.5 h-3.5 text-zinc-400" />
                  Rate limits (31)
                </span>
                <span className="inline-flex items-center gap-2 rounded-full border border-zinc-800 bg-zinc-900/60 px-3 py-1 text-xs text-zinc-200">
                  <Tag className="w-3.5 h-3.5 text-zinc-400" />
                  SDK setup (24)
                </span>
              </div>
              <div className="mt-5 rounded-md bg-black/50 border border-zinc-800 p-3">
                <div className="relative h-40">
                  <Bar data={insightsChartData} options={insightsChartOptions} />
                </div>
              </div>
              <div className="mt-4 grid grid-cols-3 gap-3 text-xs">
                <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-3">
                  <div className="text-zinc-400">Avg. time to answer</div>
                  <div className="mt-1 font-medium text-white">12s</div>
                </div>
                <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-3">
                  <div className="text-zinc-400">Resolved by AI</div>
                  <div className="mt-1 font-medium text-white">89%</div>
                </div>
                <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-3">
                  <div className="text-zinc-400">New flashcards</div>
                  <div className="mt-1 font-medium text-white">316</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
