'use client';

import { ChangeEvent, FormEvent, useEffect, useRef, useState } from 'react';
import { ArrowRight, Link2, ShieldCheck, UploadCloud } from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { useUnifiedRouting } from '@/lib/routing';
import { uploadVideoFile } from '@/lib/upload-video';
import {
  savePendingUpload,
  setPendingUploadFlag,
} from '@/lib/pending-upload-store';
import { CLERK_SIGN_IN_URL, CLERK_SIGN_UP_URL } from '@/lib/clerk-env';
import { extractYouTubeVideoId } from '@/lib/youtube';
import { savePendingYouTubeUrl } from '@/lib/pending-youtube-store';

export default function Hero() {
  const animatedRefs = useRef<(HTMLElement | null)[]>([]);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const { redirectToSignIn } = useUnifiedRouting();
  const { isSignedIn, isLoaded } = useAuth();
  const router = useRouter();

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [youtubeUrl, setYoutubeUrl] = useState('');
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

    const youtubeVideoId = extractYouTubeVideoId(youtubeUrl);

    if (!selectedFile && !youtubeVideoId) {
      setError('Upload a training video to start — MP4, WebM, or MOV.');
      return;
    }

    if (!isLoaded) {
      setError('Checking sign-in status…');
      return;
    }

    if (!isSignedIn) {
      if (youtubeVideoId) {
        if (!savePendingYouTubeUrl(youtubeUrl)) {
          setError('Could not save that YouTube link. Please try again after signing in.');
          return;
        }
        redirectToSignIn({ source: 'hero', query: { resumeYoutube: '1' } });
        return;
      }
      if (!selectedFile) return;
      setError('Sign in to upload — your video will resume automatically after login.');
      try {
        await savePendingUpload(selectedFile);
        setPendingUploadFlag();
      } catch {
        setError('Could not save your video for sign-in. Sign in first, then upload again.');
        return;
      }
      redirectToSignIn({
        source: 'hero',
        query: { resumeUpload: '1' },
      });
      return;
    }

    setError('');
    setIsSubmitting(true);

    try {
      if (youtubeVideoId) {
        router.push(`/workspace/${encodeURIComponent(youtubeVideoId)}?source=youtube`);
        return;
      }
      if (!selectedFile) return;
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
              Introducing SkillProof Studio · by ChatPye
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
              Turn training videos into guided work and trusted skill evidence.
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
              <span className="hidden">
              Employees upskill from your videos with AI tutors. HR and managers see verified skills — or share a public competency profile to bring your company onboard.
              </span>
              SkillProof Studio is ChatPye&apos;s first workforce product: an AI learning workspace where employees and early-career talent learn from your tutorials, build real work, and give managers evidence they can review.
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
              <span className="hidden">
              Custom video QA · No YouTube dependency · Shareable skill profiles
              </span>
              Public YouTube or private uploads · Timestamped tutor · Manager-reviewed evidence
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
                <div className="flex items-center gap-2 rounded-xl border border-zinc-700 bg-zinc-900/70 px-3 py-3">
                  <Link2 className="h-4 w-4 shrink-0 text-zinc-400" />
                  <input
                    value={youtubeUrl}
                    onChange={(event) => { setYoutubeUrl(event.target.value); setSelectedFile(null); setError(''); }}
                    placeholder="Paste a public YouTube tutorial URL"
                    className="w-full bg-transparent text-sm text-white placeholder:text-zinc-500 focus:outline-none"
                    disabled={isSubmitting}
                  />
                </div>
                <p className="text-left text-xs text-zinc-500">Start a SkillProof Studio workspace from a public YouTube tutorial, or upload your team&apos;s video.</p>
                <button
                  type="button"
                  onClick={openFilePicker}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-zinc-700 bg-zinc-900/70 px-4 py-8 text-sm font-medium text-white transition hover:border-zinc-500 hover:bg-zinc-900"
                  disabled={isSubmitting}
                >
                  <UploadCloud className="h-5 w-5" />
                  {selectedFile ? selectedFile.name : 'Or upload a training video (MP4, WebM, MOV)'}
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
                  disabled={isSubmitting || (!selectedFile && !youtubeUrl.trim()) || !isLoaded}
                >
                  {isSubmitting
                    ? 'Uploading…'
                    : isLoaded && !isSignedIn
                      ? 'Sign in to start SkillProof Studio'
                      : extractYouTubeVideoId(youtubeUrl) ? 'Open SkillProof Studio' : 'Start SkillProof Studio'}
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
