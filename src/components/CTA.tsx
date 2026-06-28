import { ArrowRight, ArrowUp } from 'lucide-react';

export default function CTA() {
  return (
    <section className="relative border-t border-zinc-800">
      <div className="mx-auto max-w-7xl px-6 py-20 lg:px-8">
        <div className="relative overflow-hidden rounded-2xl border border-zinc-800 bg-gradient-to-br from-zinc-950 via-zinc-900/70 to-zinc-950 p-8 md:p-12">
          <div className="grid grid-cols-1 items-center gap-8 md:grid-cols-3">
            <div className="md:col-span-2">
              <h3 className="text-3xl sm:text-4xl font-semibold tracking-tight">Turn videos into interactive learning fast</h3>
              <p className="mt-3 text-zinc-400">Create your first Pod, invite learners, and get insights within hours.</p>
              <div className="mt-6 flex flex-col sm:flex-row gap-3">
                <a href="https://chrome.google.com/webstore" className="inline-flex items-center gap-2 rounded-md bg-white px-5 py-3 text-sm font-medium text-black hover:bg-zinc-100 transition">
                  For learners: Try free extension →
                </a>
                <a href="#demo-request" className="inline-flex items-center gap-2 rounded-md border border-zinc-800 px-5 py-3 text-sm font-medium text-white hover:bg-zinc-900 transition">
                  For teams: Request demo →
                </a>
              </div>
            </div>
            <div className="md:col-span-1">
              <div className="rounded-xl border border-zinc-800 bg-black/40 p-4">
                <div className="text-sm font-medium text-white">What you&apos;ll get</div>
                <ul className="mt-3 space-y-2 text-sm text-zinc-300">
                  <li className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 inline-block"></span>
                    AI Tutor embedded in videos
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-blue-400 inline-block"></span>
                    Pods & live leaderboards
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-amber-400 inline-block"></span>
                    Competency profiles
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-purple-400 inline-block"></span>
                    Security & SSO
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
