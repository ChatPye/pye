import { ArrowRight, ShieldCheck } from 'lucide-react';

export default function Competency() {
  return (
    <section className="relative border-t border-zinc-800">
      <div className="mx-auto max-w-7xl px-6 py-24 lg:px-8">
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-12 items-center">
          <div className="lg:col-span-5 order-2 lg:order-1">
            <h3 className="text-3xl sm:text-4xl font-semibold tracking-tight">From engagement to verified skills</h3>
            <p className="mt-4 text-lg text-zinc-400">Beyond completions, ChatPye shows who actually gained competence. Leaderboards track learner progress, while competency profiles compile evidence of skills for employers, L&D leaders, and bootcamps.</p>
            <a href="/p/demo" className="mt-6 inline-flex items-center gap-2 rounded-md bg-white px-4 py-2 text-sm font-medium text-black transition hover:bg-zinc-100">
              View Competency Profiles
              <ArrowRight className="w-4 h-4" />
            </a>
          </div>
          <div className="lg:col-span-7 order-1 lg:order-2">
            <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-5">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                {/* Leaderboard */}
                <div className="lg:col-span-2 rounded-lg border border-zinc-800 bg-zinc-900/50 p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="text-sm font-medium text-white">Leaderboard</div>
                    <span className="text-[11px] text-zinc-500">This week</span>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between rounded-md p-2 hover:bg-zinc-800/40 transition">
                      <div className="flex items-center gap-3">
                        <img className="h-7 w-7 rounded-full ring-2 ring-zinc-800 object-cover" src="https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=128&auto=format&fit=facearea&facepad=2&h=128" alt="User A" />
                        <div className="text-sm text-zinc-200">Alex Kim</div>
                      </div>
                      <div className="text-sm font-mono text-white">1840 pts</div>
                    </div>
                    <div className="flex items-center justify-between rounded-md p-2 hover:bg-zinc-800/40 transition">
                      <div className="flex items-center gap-3">
                        <img className="h-7 w-7 rounded-full ring-2 ring-zinc-800 object-cover" src="https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=128&auto=format&fit=facearea&facepad=2&h=128" alt="User B" />
                        <div className="text-sm text-zinc-200">Rosa M.</div>
                      </div>
                      <div className="text-sm font-mono text-white">1710 pts</div>
                    </div>
                    <div className="flex items-center justify-between rounded-md p-2 hover:bg-zinc-800/40 transition">
                      <div className="flex items-center gap-3">
                        <img className="h-7 w-7 rounded-full ring-2 ring-zinc-800 object-cover" src="https://images.unsplash.com/photo-1547425260-76bcadfb4f2c?q=80&w=128&auto=format&fit=facearea&facepad=2&h=128" alt="User C" />
                        <div className="text-sm text-zinc-200">Priya N.</div>
                      </div>
                      <div className="text-sm font-mono text-white">1635 pts</div>
                    </div>
                    <div className="flex items-center justify-between rounded-md p-2 hover:bg-zinc-800/40 transition">
                      <div className="flex items-center gap-3">
                        <img className="h-7 w-7 rounded-full ring-2 ring-zinc-800 object-cover" src="https://images.unsplash.com/photo-1527980965255-d3b416303d12?q=80&w=128&auto=format&fit=facearea&facepad=2&h=128" alt="User D" />
                        <div className="text-sm text-zinc-200">Morgan S.</div>
                      </div>
                      <div className="text-sm font-mono text-white">1500 pts</div>
                    </div>
                    <div className="flex items-center justify-between rounded-md p-2 hover:bg-zinc-800/40 transition">
                      <div className="flex items-center gap-3">
                        <img className="h-7 w-7 rounded-full ring-2 ring-zinc-800 object-cover" src="https://images.unsplash.com/photo-1642615835477-d303d7dc9ee9?w=1080&q=80" alt="User E" />
                        <div className="text-sm text-zinc-200">Taylor Ray</div>
                      </div>
                      <div className="text-sm font-mono text-white">1420 pts</div>
                    </div>
                  </div>
                </div>

                {/* Competency Snapshot */}
                <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="text-sm font-medium text-white">Competency Snapshot</div>
                    <span className="inline-flex items-center gap-1 rounded-md border border-emerald-500/20 bg-emerald-500/10 px-2 py-1 text-[11px] font-medium text-emerald-400">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      Verified
                    </span>
                  </div>
                  <div className="space-y-3">
                    <div>
                      <div className="flex items-center justify-between text-xs text-zinc-400">
                        <span>Backend Fundamentals</span><span className="text-zinc-300">87%</span>
                      </div>
                      <div className="mt-1 h-2 rounded bg-zinc-800 overflow-hidden">
                        <div className="h-full w-[87%] bg-gradient-to-r from-blue-500 to-indigo-500"></div>
                      </div>
                    </div>
                    <div>
                      <div className="flex items-center justify-between text-xs text-zinc-400">
                        <span>Frontend</span><span className="text-zinc-300">74%</span>
                      </div>
                      <div className="mt-1 h-2 rounded bg-zinc-800 overflow-hidden">
                        <div className="h-full w-[74%] bg-gradient-to-r from-emerald-500 to-teal-500"></div>
                      </div>
                    </div>
                    <div>
                      <div className="flex items-center justify-between text-xs text-zinc-400">
                        <span>DevOps</span><span className="text-zinc-300">65%</span>
                      </div>
                      <div className="mt-1 h-2 rounded bg-zinc-800 overflow-hidden">
                        <div className="h-full w-[65%] bg-gradient-to-r from-amber-500 to-orange-500"></div>
                      </div>
                    </div>
                  </div>
                  <div className="mt-4 rounded-md border border-zinc-800 bg-black/40 p-3">
                    <div className="text-xs text-zinc-400">Recent evidence</div>
                    <ul className="mt-2 space-y-2 text-xs">
                      <li className="flex items-center gap-2 text-zinc-300">
                        <span className="inline-flex h-1.5 w-1.5 rounded-full bg-blue-400"></span>
                        Passed API auth challenge
                      </li>
                      <li className="flex items-center gap-2 text-zinc-300">
                        <span className="inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400"></span>
                        Completed CI pipeline project
                      </li>
                      <li className="flex items-center gap-2 text-zinc-300">
                        <span className="inline-flex h-1.5 w-1.5 rounded-full bg-purple-400"></span>
                        Scored 92% on Kubernetes quiz
                      </li>
                    </ul>
                  </div>
                  <button className="mt-4 w-full inline-flex items-center justify-center gap-2 rounded-md border border-zinc-800 px-3 py-2 text-xs text-zinc-300 hover:bg-zinc-900 transition">
                    View full profile
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
