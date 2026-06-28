import { isDatabaseConfigured } from '@/lib/db';

/** Require Aurora in production paths — no Mongo/in-memory fallback. */
export function requireAurora(feature: string): void {
  if (!isDatabaseConfigured()) {
    throw new Error(
      `${feature} requires DATABASE_URL (Aurora PostgreSQL). Configure it in Vercel env vars.`
    );
  }
}
