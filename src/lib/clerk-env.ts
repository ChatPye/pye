/** Clerk routes — set in Vercel or use these defaults (match Clerk Dashboard → Paths). */
export const CLERK_SIGN_IN_URL =
  process.env.NEXT_PUBLIC_CLERK_SIGN_IN_URL || '/sign-in';

export const CLERK_SIGN_UP_URL =
  process.env.NEXT_PUBLIC_CLERK_SIGN_UP_URL || '/sign-up';

export const CLERK_SIGN_IN_FALLBACK_URL =
  process.env.NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL ||
  process.env.CLERK_SIGN_IN_FALLBACK_REDIRECT_URL ||
  '/workspace';

export const CLERK_SIGN_UP_FALLBACK_URL =
  process.env.NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL ||
  process.env.CLERK_SIGN_UP_FALLBACK_REDIRECT_URL ||
  '/auth-callback?redirect=%2Fworkspace';

export function isClerkPublishableKey(key: string | null | undefined): boolean {
  if (!key || typeof key !== 'string') return false;
  const trimmed = key.trim();
  if (!trimmed || trimmed === 'pk_test_xxx' || trimmed.endsWith('_xxx')) {
    return false;
  }
  return /^pk_(test|live)_/.test(trimmed) && trimmed.length >= 30;
}
