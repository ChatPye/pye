# ChatPye deployment guide

**Target:** Vercel (Next.js) + Amazon Aurora PostgreSQL + S3 + Bedrock  
**Last updated:** 28 June 2026

You do **not** need a local `.env.local` to deploy. Secrets go into **Vercel** and **GitHub Actions**. Local env is only for `npm run dev`.

---

## Overview

```
GitHub (main) ──► GitHub Actions ──► Vercel (frontend + API)
                         │
                         ├──► Aurora (DATABASE_URL, db:push)
                         │
AWS ◄────────────────────┴──► S3 (videos) + Bedrock (AI)
```

---

## Phase 0 — Prerequisites (one-time on your PC)

### 1. Install tools

```powershell
# AWS CLI
winget install Amazon.AWSCLI

# Node.js 20+ (if not installed)
winget install OpenJS.NodeJS.LTS

# Vercel CLI (optional — GitHub Actions can deploy without local Vercel)
npm install -g vercel
```

Restart PowerShell after installing AWS CLI.

### 2. Configure AWS

```powershell
aws configure
# Enter: Access Key ID, Secret Access Key, region (us-east-1), output json

aws sts get-caller-identity
```

### 3. Create a new GitHub repository

1. Go to [github.com/new](https://github.com/new)
2. Name: `chatpye-web`
3. **Private** recommended
4. Do **not** add README (we have one)

### 4. Fresh git history (dated 28 June 2026)

From the project folder:

```powershell
cd c:\Users\joboy\Desktop\ChatPye

.\scripts\deploy\fresh-git.ps1 -RemoteUrl "https://github.com/ChatPye/chatpye-web.git"

git push -u origin main
```

This removes old `chatpye-landing` history and creates a single commit dated **2026-06-28**.

---

## Phase 1 — AWS (Aurora + S3)

### Option A — Automated script (recommended)

```powershell
cd c:\Users\joboy\Desktop\ChatPye

.\scripts\deploy\setup-aws.ps1 -Region us-east-1 -ProjectName chatpye-staging
```

Takes ~10–15 minutes. Outputs:

- `S3_BUCKET`
- `DATABASE_URL`
- Saves `.aws-deploy-output.json` (gitignored)

### Push schema to Aurora

```powershell
.\scripts\deploy\push-schema.ps1
# Uses DATABASE_URL from .aws-deploy-output.json or $env:DATABASE_URL
```

### Option B — Manual Aurora (AWS Console)

1. RDS → Create database → **Aurora PostgreSQL** → Serverless v2
2. DB name: `chatpye`
3. Note the **writer endpoint**
4. `DATABASE_URL=postgresql://user:pass@endpoint:5432/chatpye?sslmode=require`

### S3 CORS (for browser uploads)

Replace `YOUR_VERCEL_DOMAIN` with your Vercel URL:

```powershell
@'
[
  {
    "AllowedHeaders": ["*"],
    "AllowedMethods": ["GET", "PUT", "POST", "HEAD"],
    "AllowedOrigins": ["https://YOUR_VERCEL_DOMAIN", "http://localhost:3000"],
    "ExposeHeaders": ["ETag"]
  }
]
'@ | Set-Content cors.json

aws s3api put-bucket-cors --bucket YOUR_BUCKET_NAME --cors-configuration file://cors.json
```

### IAM user for Vercel

Create an IAM user `chatpye-vercel` with policies:

- `AmazonS3FullAccess` (or scoped to your bucket)
- `AmazonBedrockFullAccess` (or scoped invoke)
- `AmazonTranscribeFullAccess` (video pipeline)

Save **Access Key ID** and **Secret Access Key** for Vercel env vars.

---

## Phase 2 — Vercel

### 1. Connect GitHub to Vercel

1. [vercel.com/new](https://vercel.com/new)
2. Import your **new** `chatpye` GitHub repo
3. Framework: **Next.js** (auto-detected)
4. Root directory: `.`
5. Do **not** deploy yet — add env vars first

### 2. Vercel environment variables

Project → Settings → Environment Variables → **Production**:

| Variable | Value |
|----------|--------|
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | From [Clerk dashboard](https://dashboard.clerk.com) |
| `CLERK_SECRET_KEY` | Clerk secret |
| `DATABASE_URL` | From setup-aws output |
| `NEXT_PUBLIC_APP_URL` | `https://your-app.vercel.app` |
| `AWS_ACCESS_KEY_ID` | IAM user key |
| `AWS_SECRET_ACCESS_KEY` | IAM user secret |
| `AWS_REGION` | `us-east-1` |
| `AWS_S3_BUCKET` | Your S3 bucket name |
| `STRIPE_SECRET_KEY` | Optional — billing |
| `STRIPE_PUBLISHABLE_KEY` | Optional |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Optional |

**Never set in production:**

- `DEV_AUTH_BYPASS`
- `DEV_FORCE_IN_MEMORY`

### 3. First deploy

Click **Deploy** in Vercel, or push to `main` (after GitHub Actions secrets are set).

### 4. Clerk production URLs

In [Clerk Dashboard](https://dashboard.clerk.com) → your **Production** instance:

#### Domains

**Configure → Domains** — add your Vercel URL, e.g. `https://chatpye-web.vercel.app`

#### Paths (must match the app)

**Configure → Paths**:

| Setting | Value |
|---------|--------|
| Sign-in URL | `/sign-in` |
| Sign-up URL | `/sign-up` |
| After sign-in | `/auth-callback` (or leave default; app handles redirect) |
| After sign-up | `/auth-callback` |

#### Allowed redirect URLs

**Configure → Paths → Allowed redirect URLs** — add:

- `https://your-app.vercel.app/*`
- `https://your-app.vercel.app/auth-callback`

#### Clerk Tier 2 environment variables (optional)

The app **defaults** these in code (`src/lib/clerk-env.ts`). You only need to set them in Vercel if you use custom paths:

| Variable | Default | Where to set |
|----------|---------|--------------|
| `CLERK_SIGN_IN_URL` | `/sign-in` | Vercel → Settings → Environment Variables |
| `CLERK_SIGN_UP_URL` | `/sign-up` | Same |
| `CLERK_SIGN_IN_FALLBACK_REDIRECT_URL` | `/workspace` | Same |
| `CLERK_SIGN_UP_FALLBACK_REDIRECT_URL` | `/auth-callback?redirect=%2Fworkspace` | Same |

Also supported (client-side): `NEXT_PUBLIC_CLERK_SIGN_IN_URL`, `NEXT_PUBLIC_CLERK_SIGN_UP_URL`, and the `NEXT_PUBLIC_*_FALLBACK_*` variants.

**Tier 1 (required):** `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` and `CLERK_SECRET_KEY` from **Clerk → API Keys**. Copy the full keys (they are long base64 strings starting with `pk_live_` / `sk_live_`).

Set HR users: User → Public metadata → `{ "role": "hr" }`

---

## Phase 3 — GitHub Actions secrets

Repo → Settings → Secrets and variables → Actions:

| Secret | Purpose |
|--------|---------|
| `VERCEL_TOKEN` | [vercel.com/account/tokens](https://vercel.com/account/tokens) |
| `VERCEL_ORG_ID` | Vercel project Settings → General |
| `VERCEL_PROJECT_ID` | Same page |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | CI build |
| `CLERK_SECRET_KEY` | CI build |
| `DATABASE_URL` | Optional — schema push on deploy |

### Get Vercel IDs

```powershell
npx vercel link
npx vercel env pull .vercel.env
# Or: Project Settings → General in Vercel dashboard
```

### Workflows

| Workflow | Trigger |
|----------|---------|
| `ci.yml` | Every PR + push to main (type-check + build) |
| `deploy-vercel.yml` | Push to main + manual dispatch |
| `deploy-lambdas.yml` | Optional — AWS Lambdas (legacy) |

Legacy ECS workflows are disabled (`*.disabled`).

---

## Phase 4 — Verify staging

1. Open `https://your-app.vercel.app`
2. Sign in with Clerk
3. Upload a video → workspace
4. HR: `/dashboard/hr` and `/dashboard/courses`
5. Employee: `/workspace/courses`

---

## What gets deployed (clean repo)

**Included:**

- `src/` — Next.js app
- `public/` — static assets
- `lambda-functions/` — optional AWS Lambdas
- `scripts/deploy/` — AWS + git helpers
- `docs/` — architecture + this guide
- `.github/workflows/ci.yml`, `deploy-vercel.yml`

**Excluded (gitignored / not needed on Vercel):**

- `node_modules/`, `.next/`, `dist/`
- `.env*`, `.aws-deploy-output.json`
- `chatpye-extension-v3/` build outputs
- Disabled workflows (`*.disabled`)

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| Build fails: Clerk | Add real Clerk keys to Vercel + GitHub secrets |
| Sign-in page spins forever / no widget | Invalid `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` — copy full key from Clerk API Keys; add Vercel domain in Clerk Domains |
| Sign in / Sign up missing in nav | Redeploy after auth fix; keys must be valid so `ClerkProvider` mounts |
| DB connection timeout | Aurora SG must allow your IP or use Vercel + [Vercel Postgres alternative] or RDS Proxy |
| Upload fails | Check S3 CORS + IAM keys on Vercel |
| HR dashboard 403 | Set Clerk `publicMetadata.role = "hr"` |

### Aurora + Vercel networking

Vercel serverless runs on public IPs. Aurora in a private VPC needs either:

- **Publicly accessible** Aurora instance (staging OK; restrict SG to Vercel IP ranges), or
- **RDS Proxy** + public subnet, or
- **Neon/Supabase** as interim if VPC is blocked

For staging, enable **Publicly accessible = Yes** on the Aurora instance in RDS console.

---

## Quick command reference

```powershell
# Local dev only
cp env.example .env.local
npm install && npm run dev

# AWS setup
.\scripts\deploy\setup-aws.ps1
.\scripts\deploy\push-schema.ps1

# Fresh GitHub repo
.\scripts\deploy\fresh-git.ps1 -RemoteUrl "https://github.com/ChatPye/chatpye-web.git"
git push -u origin main

# Manual Vercel deploy
npx vercel --prod
```

---

## Connect Cursor / agent to Vercel

1. Create Vercel token (account settings)
2. Share `VERCEL_ORG_ID` + `VERCEL_PROJECT_ID` in GitHub secrets (not in chat)
3. Agent can run `npx vercel deploy --prod --token=...` once token is in your environment

**Do not paste production secrets into chat.**
