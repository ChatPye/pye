'use client';

import Link from 'next/link';

export default function WorkspaceFooter() {
  return (
    <footer className="border-t border-zinc-900/80 bg-black/80 backdrop-blur supports-[backdrop-filter]:bg-black/60">
      <div className="mx-auto flex max-w-7xl flex-col gap-3 px-6 py-5 text-xs text-zinc-500 md:flex-row md:items-center md:justify-between lg:px-8">
        <div className="flex items-center gap-2 text-zinc-400">
          <div className="h-6 w-6 overflow-hidden rounded-md">
            <img src="/favicon.ico" alt="ChatPye" className="h-full w-full object-contain" />
          </div>
          <span>ChatPye Pro Workspace</span>
          <span className="hidden md:inline">•</span>
          <span>Empowering teams to learn with AI</span>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <Link href="/extension" className="text-zinc-400 transition hover:text-white">
            Extension
          </Link>
          <Link href="/pricing" className="text-blue-300 transition hover:text-blue-200">
            Upgrade plan
          </Link>
          <Link href="/enterprise" className="text-zinc-400 transition hover:text-white">
            Enterprise contact
          </Link>
          <Link href="/support" className="text-zinc-400 transition hover:text-white">
            Support
          </Link>
          <span className="text-zinc-500">© {new Date().getFullYear()} ChatPye</span>
        </div>
      </div>
    </footer>
  );
}
