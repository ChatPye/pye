# GitHub Actions secrets

Configure at: `https://github.com/ChatPye/chatpye-web/settings/secrets/actions`

## Required for CI

| Secret | Source |
|--------|--------|
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk Dashboard → API Keys (full `pk_live_…` string) |
| `CLERK_SECRET_KEY` | Clerk Dashboard → API Keys (full `sk_live_…` string) |

**Clerk Tier 2 (optional):** `CLERK_SIGN_IN_URL`, `CLERK_SIGN_UP_URL`, fallback redirect URLs — see [DEPLOY.md](../DEPLOY.md#4-clerk-production-urls). Defaults are built into the app.

## Required for Vercel deploy workflow

| Secret | Source |
|--------|--------|
| `VERCEL_TOKEN` | https://vercel.com/account/tokens |
| `VERCEL_ORG_ID` | Vercel Project → Settings → General |
| `VERCEL_PROJECT_ID` | Vercel Project → Settings → General |

## Optional

| Secret | Source |
|--------|--------|
| `DATABASE_URL` | Output of `scripts/deploy/setup-aws.ps1` |

## Vercel environment variables (separate from GitHub)

Set all runtime secrets in **Vercel Project → Settings → Environment Variables** (see [DEPLOY.md](./DEPLOY.md)).
