# Deployment and Architecture

## Production topology

```text
Browser
  │
  ├─ Vercel / Next.js ── Clerk authentication and role claims
  │      │
  │      ├─ Gemini Interactions API: public YouTube understanding
  │      ├─ AWS Bedrock: tutor, summary and embeddings fallback
  │      ├─ AWS S3 + Transcribe: uploaded-video processing
  │      ├─ Redis: short-lived chat/retrieval cache
  │      └─ CockroachDB (planned system of record): organisations, assignments,
  │         evidence, competency assertions and reviewer decisions
  │
  └─ Future Windows companion (opt-in): VS Code/Excel assistance
```

## Environment variables

### Vercel

- Clerk publishable and secret keys
- `GEMINI_API_KEY`, `GEMINI_VIDEO_MODEL=gemini-3.6-flash`
- AWS region and narrowly-scoped AWS credentials/role configuration
- `DATABASE_URL` (when database is configured)
- `REDIS_URL` (optional but recommended for shared response caching)
- `COURSE_INVITE_SECRET` (long random value)
- `NEXT_PUBLIC_APP_URL=https://<your-production-domain>`

### AWS

Use least-privilege roles. The web app should only access its upload prefix, the specific Transcribe/S3 resources required for uploads, and approved Bedrock models. Keep long-running media work behind queue/worker mechanisms rather than a single browser request.

## Deployment order

1. Push the verified feature branch to GitHub.
2. Open a draft PR, with the Build Week evidence file included.
3. Let Vercel build a preview deployment; add all environment values there.
4. Run the quality checklist in `DEVELOPER_GUIDE.md` against preview.
5. Merge only after public YouTube processing, chat and course-sharing work in preview.
6. Promote through Vercel to production.

## Vercel Hobby preview behaviour

The web pilot does not require a frequent Vercel Cron job. New videos start
processing from the learner's workspace, and the workspace advances the
processing stages through the authenticated processing endpoints while it is
open. The former two-minute cron was only a recovery mechanism and is omitted
from `vercel.json` so preview deployments work on a Hobby account. Add a
queue/worker and an appropriately provisioned scheduler when long-running
uploaded-video workloads move to AWS.

## CockroachDB adoption plan

Do not swap the live database connection abruptly. Create a CockroachDB staging cluster, provide its PostgreSQL-compatible connection string as `DATABASE_URL`, generate/review a Drizzle migration, run the assignment/evidence flow and then schedule production migration with rollback and backup. CockroachDB should own durable business data; S3 remains the media store.
