'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { extensionCommunication } from '@/lib/extension-communication';

export default function ReturnPage() {
  const [handshakeCode, setHandshakeCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Check if this is a Stripe checkout return
    const params = new URLSearchParams(window.location.search);
    const sessionId = params.get('session_id');
    
    if (sessionId) {
      // TODO: Verify the session was successful
      console.log('Checkout session completed:', sessionId);
    }
  }, []);

  const generateHandshakeCode = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/extension/token', { method: 'GET' });
      const data = await res.json();
      if (data.success) {
        setHandshakeCode(data.handshakeCode);
        
        // Send handshake code to extension using robust communication service
        try {
          await extensionCommunication.sendHandshake(data.handshakeCode, data.expiresIn);
          console.log('✅ Handshake sent to extension:', data.handshakeCode);
        } catch (error) {
          console.warn('⚠️ Extension communication failed:', error);
          // Don't break the flow - extension might not be installed or active
        }
      }
    } catch (error) {
      console.error('Error generating handshake code:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <div className="text-center">
        <h1 className="text-3xl font-semibold">You're all set!</h1>
        <p className="mt-3 text-zinc-400">
          Your subscription is active. Connect your extension to start using premium features.
        </p>
        
        <div className="mt-8 p-6 bg-zinc-900 rounded-lg border border-zinc-800">
          <h3 className="text-lg font-medium mb-4">Connect Your Extension</h3>
          <p className="text-sm text-zinc-400 mb-4">
            Click the button below to generate a connection code for your extension.
          </p>
          
          {!handshakeCode ? (
            <button
              onClick={generateHandshakeCode}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-md bg-white px-6 py-3 text-sm font-medium text-black transition hover:bg-zinc-100 disabled:opacity-60"
            >
              {loading ? 'Generating...' : 'Connect Extension'}
            </button>
          ) : (
            <div className="space-y-4">
              <div className="p-4 bg-zinc-800 rounded-md">
                <div className="text-sm text-zinc-400 mb-2">Connection Code:</div>
                <div className="font-mono text-lg font-bold text-green-400">{handshakeCode}</div>
                <div className="text-xs text-zinc-500 mt-2">This code expires in 5 minutes</div>
              </div>
              <p className="text-sm text-zinc-400">
                The extension should automatically detect this code. If not, enter it manually in the extension.
              </p>
            </div>
          )}
        </div>
        
        <div className="mt-8 flex gap-3 justify-center">
          <a href="https://www.youtube.com" className="inline-flex items-center gap-2 rounded-md bg-white px-6 py-3 text-sm font-medium text-black transition hover:bg-zinc-100">
            Open YouTube
          </a>
          <Link href="/" className="inline-flex items-center gap-2 rounded-md border border-zinc-800 px-6 py-3 text-sm font-medium text-white transition hover:border-zinc-700 hover:bg-zinc-900">
            Back to Home
          </Link>
        </div>
      </div>
    </main>
  );
}


