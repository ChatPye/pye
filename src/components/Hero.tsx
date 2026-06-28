'use client';

import { ChangeEvent, FormEvent, useEffect, useRef, useState } from 'react';
import { ArrowRight, ShieldCheck, UploadCloud } from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { useUnifiedRouting } from '@/lib/routing';
import { uploadVideoFile } from '@/lib/upload-video';
import { CLERK_SIGN_IN_URL, CLERK_SIGN_UP_URL } from '@/lib/clerk-env';

export default function Hero() {
  const animatedRefs = useRef<(HTMLElement | null)[]>([]);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const { redirectToSignIn } = useUnifiedRouting();
  const { isSignedIn, isLoaded } = useAuth();
  const router = useRouter();

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const target = entry.target as HTMLElement;
            target.style.opacity = '1';
            target.style.transform = 'translateY(0)';
          }
        });
      },
      { threshold: 0.2 }
    );

    animatedRefs.current.forEach((el) => {
      if (el) {
        el.style.opacity = el.style.opacity || '0';
        el.style.transform = el.style.transform || 'translateY(12px)';
        observer.observe(el);
      }
    });

    return () => observer.disconnect();
  }, []);

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    setSelectedFile(file);
    setError('');
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSubmitting) return;

    if (!selectedFile) {
      setError('Upload a training video to start — MP4, WebM, or MOV.');
      return;
    }

    if (!isLoaded) {
      setError('Checking sign-in status…');
      return;
    }

    if (!isSignedIn) {
      redirectToSignIn({
        source: 'hero',
        query: { source: 'upload' },
      });
      return;
    }

    setError('');
    setIsSubmitting(true);

    try {
      const result = await uploadVideoFile(
        selectedFile,
        selectedFile.name.replace(/\.[^/.]+$/, '')
      );

      if (!result.success || !result.videoId) {
        setError(result.error || 'Upload failed. Please try again.');
        return;
      }

      router.push(`/workspace/${encodeURIComponent(result.videoId)}?source=upload`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const openFilePicker = () => {
    fileInputRef.current?.click();
  };

  return (
    <section className="relative">
      <div className="mx-auto max-w-7xl px-6 pt-20 pb-16 lg:px-8 lg:pt-28">
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-12 items-center">
          <div className="lg:col-span-12 text-center">
            <div
              ref={(el) => {
                animatedRefs.current[0] = el;
              }}
              className="inline-flex items-center gap-2 rounded-full border border-zinc-800 bg-zinc-900/50 px-3 py-1 text-[11px] text-zinc-300 backdrop-blur"
              style={{
                opacity: 1,
                transform: 'translateY(0px)',
                transition: '0.6s cubic-bezier(0.16, 1, 0.3, 1)',
              }}
            >
              <span className="inline-flex h-1.5 w-1.5 rounded-full bg-green-400" />
              AI learning &amp; development for teams
            </div>

            <h1
              ref={(el) => {
                animatedRefs.current[1] = el;
              }}
              className="mt-6 text-4xl sm:text-5xl lg:text-6xl font-semibold tracking-tight text-white max-w-4xl mx-auto"
              style={{
                opacity: 1,
                transform: 'translateY(0px)',
                transition: '0.7s cubic-bezier(0.16, 1, 0.3, 1) 0.05s',
              }}
            >
              Upload training videos. Chat with AI. Prove competency.
            </h1>

            <p
              ref={(el) => {
                animatedRefs.current[2] = el;
              }}
              className="mt-6 text-lg text-zinc-400 max-w-2xl mx-auto"
              style={{
                opacity: 1,
                transform: 'translateY(0px)',
                transition: '0.7s cubic-bezier(0.16, 1, 0.3, 1) 0.1s',
              }}
            >
              Employees upskill from your videos with AI tutors. HR and managers see verified skills — or share a public competency profile to bring your company onboard.
            </p>

            <div
              ref={(el) => {
                animatedRefs.current[3] = el;
              }}
              className="mt-6 flex items-center justify-center gap-3 text-xs text-zinc-500"
              style={{
                opacity: 0,
                transform: 'translateY(12px)',
                transition: 'all .7s cubic-bezier(.16,1,.3,1)',
                transitionDelay: '.12s',
              }}
            >
              <ShieldCheck className="w-4 h-4 text-zinc-400" />
              Custom video QA · No YouTube dependency · Shareable skill profiles
            </div>

            <div
              ref={(el) => {
                animatedRefs.current[4] = el;
              }}
              className="mt-10 max-w-xl mx-auto"
              style={{
                opacity: 0,
                transform: 'translateY(12px)',
                transition: 'all .7s cubic-bezier(.16,1,.3,1)',
                transitionDelay: '.15s',
              }}
            >
              <form
                id="start-learning"
                onSubmit={handleSubmit}
                className="flex flex-col gap-3 rounded-2xl border border-zinc-800 bg-zinc-950/80 p-4 backdrop-blur"
              >
                <button
                  type="button"
                  onClick={openFilePicker}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-zinc-700 bg-zinc-900/70 px-4 py-8 text-sm font-medium text-white transition hover:border-zinc-500 hover:bg-zinc-900"
                  disabled={isSubmitting}
                >
                  <UploadCloud className="h-5 w-5" />
                  {selectedFile ? selectedFile.name : 'Upload a training video (MP4, WebM, MOV)'}
                </button>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="video/mp4,video/webm,video/quicktime"
                  className="hidden"
                  onChange={handleFileChange}
                />

                <button
                  type="submit"
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-semibold text-black transition hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={isSubmitting || !selectedFile || !isLoaded}
                >
                  {isSubmitting
                    ? 'Uploading…'
                    : isLoaded && !isSignedIn
                      ? 'Sign in to start learning'
                      : 'Start learning'}
                  <ArrowRight className="h-4 w-4" />
                </button>

                <p className="text-left text-xs text-zinc-500">
                  {isLoaded && !isSignedIn ? (
                    <>
                      <Link href={CLERK_SIGN_IN_URL} className="text-blue-400 hover:text-blue-300">
                        Sign in
                      </Link>
                      {' or '}
                      <Link href={CLERK_SIGN_UP_URL} className="text-blue-400 hover:text-blue-300">
                        create an account
                      </Link>
                      {' to upload and chat with your video.'}
                    </>
                  ) : (
                    <>
                      Signed in — your video will upload securely to your workspace.
                    </>
                  )}
                </p>

                {error && <p className="text-left text-sm text-rose-400">{error}</p>}
              </form>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
