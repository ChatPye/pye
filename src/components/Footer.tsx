'use client';

import { useEffect, useState } from 'react';
// Removed Sparkles import as we're now using favicon.ico for the logo

export default function Footer() {
  const [year, setYear] = useState(new Date().getFullYear());

  useEffect(() => {
    setYear(new Date().getFullYear());
  }, []);

  return (
    <footer className="relative border-t border-zinc-800">
      <div className="mx-auto max-w-7xl px-6 py-12 lg:px-8">
        <div className="grid grid-cols-1 gap-10 md:grid-cols-4">
          <div>
            <div className="inline-flex items-center gap-2">
              <div className="h-7 w-7 rounded-md overflow-hidden">
                <img src="/favicon.ico" alt="ChatPye" className="w-full h-full object-contain" />
              </div>
              <span className="text-sm font-medium">ChatPye</span>
            </div>
            <p className="mt-3 text-sm text-zinc-400 max-w-xs">AI-native LMS that transforms training videos into interactive learning.</p>
          </div>
          <div>
            <h4 className="text-sm font-medium text-white">Product</h4>
            <ul className="mt-3 space-y-2 text-sm text-zinc-400">
              <li><a className="hover:text-white transition" href="#features">Features</a></li>
              <li><a className="hover:text-white transition" href="#pricing">Pricing</a></li>
              <li><a className="hover:text-white transition" href="/extension">YouTube Extension</a></li>
              <li><a className="hover:text-white transition" href="/enterprise">Enterprise</a></li>
            </ul>
          </div>
          <div>
            <h4 className="text-sm font-medium text-white">Company</h4>
            <ul className="mt-3 space-y-2 text-sm text-zinc-400">
              <li><a className="hover:text-white transition" href="/pyelab">About</a></li>
              <li><a className="hover:text-white transition" href="/pyelab">Pye Lab</a></li>
              <li><a className="hover:text-white transition" href="/extension">Extension</a></li>
            </ul>
          </div>
          <div>
            <h4 className="text-sm font-medium text-white">Security</h4>
            <ul className="mt-3 space-y-2 text-sm text-zinc-400">
              <li>SOC2-ready</li>
              <li>SSO/SAML</li>
              <li>Data residency</li>
            </ul>
          </div>
        </div>
        <div className="mt-10 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-zinc-800 pt-6 text-xs text-zinc-500">
          <div>© {year} ChatPye / Pye Interactive Limited. All rights reserved.</div>
          <div className="flex items-center gap-4">
            <a href="/privacy" className="hover:text-white transition">Privacy</a>
            <a href="/privacy" className="hover:text-white transition">Terms</a>
            <a href="#demo-form" className="hover:text-white transition">Contact</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
