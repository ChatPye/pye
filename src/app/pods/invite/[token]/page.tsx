'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';

export default function PodInvitePage() {
  const params = useParams<{ token: string }>();
  const router = useRouter();
  const [status, setStatus] = useState<'loading' | 'auth' | 'error' | 'success'>('loading');
  const [podId, setPodId] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const token = params?.token;
    if (!token) return;

    (async () => {
      try {
        const res = await fetch(`/api/pods/invite/${encodeURIComponent(token)}/accept`, {
          method: 'POST',
          credentials: 'include',
        });
        const data = await res.json();

        if (res.status === 401) {
          setStatus('auth');
          return;
        }

        if (!res.ok || !data.success) {
          setStatus('error');
          setMessage(data.error || 'Invite invalid or expired');
          return;
        }

        setPodId(data.podId);
        setStatus('success');
        setTimeout(() => {
          router.replace(`/pods/${encodeURIComponent(data.podId)}`);
        }, 1500);
      } catch {
        setStatus('error');
        setMessage('Something went wrong accepting the invite');
      }
    })();
  }, [params?.token, router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-black px-6 text-white">
      <div className="max-w-md space-y-4 text-center">
        {status === 'loading' && <p className="text-zinc-400">Accepting your pod invite…</p>}
        {status === 'auth' && (
          <>
            <h1 className="text-xl font-semibold">Sign in to join the pod</h1>
            <Link
              href={`/sign-in?redirect_url=${encodeURIComponent(`/pods/invite/${params.token}`)}`}
              className="inline-block rounded-lg bg-emerald-500 px-4 py-2 text-sm font-medium text-black"
            >
              Sign in
            </Link>
          </>
        )}
        {status === 'success' && (
          <>
            <h1 className="text-xl font-semibold text-emerald-400">You joined the pod!</h1>
            <p className="text-zinc-400">Redirecting to {podId}…</p>
          </>
        )}
        {status === 'error' && (
          <>
            <h1 className="text-xl font-semibold text-rose-400">Could not join pod</h1>
            <p className="text-zinc-400">{message}</p>
            <Link href="/pods" className="text-sm text-blue-400 hover:text-blue-300">
              Browse pods
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
