export default function ForLearners() {
  return (
    <section className="relative border-t border-zinc-800">
      <div className="mx-auto max-w-7xl px-6 py-20 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight">For Learners</h2>
          <p className="mt-4 text-lg text-zinc-400">Everything you need to learn from any YouTube video.</p>
        </div>
        <div className="mt-10 grid gap-4 sm:gap-6 md:grid-cols-2 lg:grid-cols-3 max-w-5xl mx-auto">
          {/* Card 1 */}
          <article className="group relative overflow-hidden sm:p-8 bg-white/5 border-white/10 border rounded-2xl pt-6 pr-6 pb-6 pl-6 backdrop-blur-sm">
            <div className="absolute -left-24 -top-24 h-56 w-56 rounded-full bg-indigo-500/10 blur-3xl"></div>
            <div className="flex gap-4 items-start">
              <div className="relative">
                <div className="grid h-12 w-12 place-items-center rounded-full bg-white/5 ring-1 ring-white/15">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5 text-indigo-300">
                    <path d="M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z"></path>
                  </svg>
                </div>
                <div className="pointer-events-none absolute -inset-4 rounded-full border border-white/5"></div>
              </div>
            </div>
            <h3 className="mt-6 text-[22px] sm:text-[24px] font-semibold tracking-tight text-white">Chat with any YouTube video</h3>
            <p className="mt-3 text-slate-400">Ask questions and get instant explanations while you watch.</p>
          </article>

          {/* Card 2 */}
          <article className="group relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 p-6 sm:p-8 backdrop-blur-sm">
            <div className="absolute right-[-20%] top-[-30%] h-64 w-64 rounded-full bg-cyan-400/10 blur-3xl"></div>
            <div className="flex items-start gap-4">
              <div className="relative">
                <div className="grid h-12 w-12 place-items-center rounded-full bg-white/5 ring-1 ring-white/15">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5 text-cyan-300">
                    <path d="M13.4 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-7.4"></path>
                    <path d="M2 6h4"></path>
                    <path d="M2 10h4"></path>
                    <path d="M2 14h4"></path>
                    <path d="M2 18h4"></path>
                    <path d="M21.378 5.626a1 1 0 1 0-3.004-3.004l-5.01 5.012a2 2 0 0 0-.506.854l-.837 2.87a.5.5 0 0 0 .62.62l2.87-.837a2 2 0 0 0 .854-.506z"></path>
                  </svg>
                </div>
                <div className="pointer-events-none absolute -inset-4 rounded-full border border-white/5"></div>
              </div>
            </div>
            <h3 className="mt-6 text-[22px] sm:text-[24px] font-semibold tracking-tight text-white">Notes that write themselves</h3>
            <p className="mt-3 text-slate-400">Auto‑capture highlights, generate flashcards, and keep everything searchable.</p>
          </article>

          {/* Card 3 */}
          <article className="group relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 p-6 sm:p-8 backdrop-blur-sm">
            <div className="absolute -bottom-24 -right-24 h-64 w-64 rounded-full bg-fuchsia-500/10 blur-3xl"></div>
            <div className="flex items-start gap-4">
              <div className="relative">
                <div className="grid h-12 w-12 place-items-center rounded-full bg-white/5 ring-1 ring-white/15">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5 text-fuchsia-300">
                    <circle cx="12" cy="12" r="10"></circle>
                    <circle cx="12" cy="12" r="6"></circle>
                    <circle cx="12" cy="12" r="2"></circle>
                  </svg>
                </div>
                <div className="pointer-events-none absolute -inset-4 rounded-full border border-white/5"></div>
              </div>
            </div>
            <h3 className="mt-6 text-[22px] sm:text-[24px] font-semibold tracking-tight text-white">Cut interruptions, stay in flow</h3>
            <p className="mt-3 text-slate-400">Route pings to Focus Mode and surface only what's urgent when you're ready.</p>
          </article>
        </div>
        <div className="mt-8 flex items-center justify-center gap-3">
          <a href="#start-learning" className="inline-flex items-center gap-2 rounded-md bg-white px-6 py-3 text-sm font-semibold text-black transition hover:bg-zinc-100 shadow-lg">
            Try Now
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
              <path d="M5 12h14"></path>
              <path d="m12 5 7 7-7 7"></path>
            </svg>
          </a>
          <a href="https://chrome.google.com/webstore/detail/chatpye" className="inline-flex items-center gap-2 rounded-md border border-white/15 px-6 py-3 text-sm font-medium text-white transition hover:bg-white/10">
            Install Extension
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
              <path d="M5 12h14"></path>
              <path d="m12 5 7 7-7 7"></path>
            </svg>
          </a>
        </div>
      </div>
    </section>
  );
}
