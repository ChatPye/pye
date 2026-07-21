# SkillProof Studio by ChatPye

AI-powered learning and workforce-development platform. Turn a training video into an interactive tutor, practical task plan, evidence-backed competency profile and manager-ready review.

> **OpenAI Build Week:** This project builds on prior ChatPye work. The Build Week additions and Codex/GPT-5.6 evidence are documented in [docs/hackathon/OPENAI_BUILD_WEEK_EVIDENCE.md](docs/hackathon/OPENAI_BUILD_WEEK_EVIDENCE.md).

**Release date:** 28 June 2026  
**Deploy target:** Vercel + Amazon Aurora PostgreSQL + S3 + Bedrock

## Features

- **Video QA pipeline** — Upload → Transcribe → RAG chat with timestamps
- **HR dashboard** — Team progress, course assignment (`/dashboard/hr`)
- **Course management** — Create and assign courses by email (`/dashboard/courses`)
- **Competency profiles** — Shareable public links (`/p/[slug]`)
- **Employee workspace** — Assigned courses, AI tutor (`/workspace`)

## Tech stack

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 15, React, Tailwind — **Vercel** |
| Database | **Amazon Aurora PostgreSQL** + Drizzle ORM |
| Storage | **Amazon S3** |
| AI | **Amazon Bedrock** (Claude + Titan embeddings) |
| Auth | Clerk |

## Local development (optional)

Local `.env.local` is **not required for deployment**. Use it only for dev:

```powershell
npm install
Copy-Item env.example .env.local
# Fill Clerk keys; DATABASE_URL optional (uses in-memory fallback)
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

HR dev bypass (local only):

```env
DEV_AUTH_BYPASS=true
DEV_HR_ROLE=hr
DEV_ORG_SLUG=dev-org
```

## Deploy to production

**Full step-by-step guide:** [docs/DEPLOY.md](docs/DEPLOY.md)

Quick start:

```powershell
# 1. AWS (Aurora + S3)
.\scripts\deploy\setup-aws.ps1
.\scripts\deploy\push-schema.ps1

# 2. Fresh GitHub repo (dated 2026-06-28)
.\scripts\deploy\fresh-git.ps1 -RemoteUrl "https://github.com/YOUR_ORG/chatpye.git"
git push -u origin main

# 3. Connect repo in Vercel, add env vars, deploy
```

GitHub Actions: `ci.yml` (validate) + `deploy-vercel.yml` (production deploy).

## Key routes

| Route | Description |
|-------|-------------|
| `/` | Landing |
| `/workspace` | Learner workspace |
| `/workspace/courses` | Assigned courses |
| `/dashboard/hr` | HR / L&D dashboard |
| `/dashboard/courses` | Course admin |
| `/p/[slug]` | Public competency profile |

## Database

```powershell
npm run db:push      # Push schema to Aurora
npm run db:studio    # Drizzle Studio
```

## Docs

- [Deployment guide](docs/DEPLOY.md)
- [Architecture](docs/ARCHITECTURE.md)
- [Requirements alignment](docs/REQUIREMENTS_ALIGNMENT.md)
- [GitHub secrets](docs/secrets/github-secrets.md)

## License

Proprietary — ChatPye
