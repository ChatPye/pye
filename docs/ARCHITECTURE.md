# ChatPye Architecture

## Recommendation: Amazon Aurora PostgreSQL

For ChatPye's multi-tenant L&D SaaS with competency graphs, course hierarchies, and HR reporting, **Aurora PostgreSQL** is the best primary database.

| Database | Verdict |
|----------|---------|
| **Aurora PostgreSQL** | **Recommended** — relational model, ACID, joins, pgvector for video RAG |
| Aurora DSQL | Future option for global multi-region at Fortune 500 scale |
| DynamoDB | Supplement only — event streams, not core domain |

## System Overview

```
┌─────────────┐     ┌──────────────────┐     ┌─────────────────────┐
│   Users     │────▶│  Vercel (Next.js) │────▶│  Amazon Cognito     │
│ Employees   │     │  App Router + BFF │     │  Auth / SSO         │
│ HR / Trainers│    └────────┬─────────┘     └─────────────────────┘
└─────────────┘              │
                             ▼
              ┌──────────────────────────────────┐
              │         API Layer                │
              │  /api/videos  /api/chat          │
              │  /api/courses /api/competencies  │
              └──────┬───────────┬───────────────┘
                     │           │
         ┌───────────▼───┐   ┌───▼────────────┐
         │ Aurora PG     │   │ Amazon S3      │
         │ + pgvector    │   │ Video uploads  │
         └───────────────┘   └───┬────────────┘
                                 │
                     ┌───────────▼────────────┐
                     │ Step Functions Pipeline │
                     │ MediaConvert → Transcribe│
                     │ → Chunk → Bedrock embed │
                     └───────────┬────────────┘
                                 │
                     ┌───────────▼────────────┐
                     │ Amazon Bedrock         │
                     │ Claude chat + Titan    │
                     │ embeddings             │
                     └────────────────────────┘
```

## Video QA Pipeline

1. **Upload** — Presigned S3 POST from `/api/videos/upload`
2. **Trigger** — S3 event → EventBridge → Step Functions
3. **Transcode** — AWS MediaConvert to HLS/MP4
4. **Transcribe** — AWS Transcribe for speech-to-text
5. **Chunk & embed** — Lambda splits transcript, Bedrock Titan Embeddings
6. **Index** — Segments + vectors stored in Aurora (pgvector)
7. **Chat** — RAG retrieval → Bedrock Claude with timestamp citations

## Competency Model (CaSS-inspired)

- **Competencies** — Skills defined per org or marketplace course
- **Assertions** — Claims about user capability with evidence and issuer
- **Learning events** — Chat, views, quizzes feed the assertion engine
- **Certificates** — Public slug at `/p/[slug]` for viral HR onboarding

## Implementation Phases

See [REQUIREMENTS_ALIGNMENT.md](./REQUIREMENTS_ALIGNMENT.md) for full product mapping.

### Phase 1 — MVP (in progress)
- **Base:** chatpye-landing — landing, workspace, Clerk, Stripe, AWS Lambdas
- Aurora PostgreSQL schema + Drizzle (`src/lib/db/schema.ts`)
- Custom video QA pipeline (upload → Transcribe → Bedrock RAG) — no YouTube transcript dependency
- Simplified hero (upload-first), public profile `/p/[slug]`, workspace competencies
- MongoDB → Aurora migration for video/chat routes

### Phase 2 — B2B L&D
- Org admin, course assignment, HR/manager dashboards
- Training org marketplace, certificate → assertion flow
- "Invite your manager" viral hook on public profiles

### Phase 3 — Scale
- SSO, CaSS-compatible exports, employment signals
- Multi-region (Aurora DSQL evaluation), optional DynamoDB event stream

## Deployment

| Component | Platform |
|-----------|----------|
| Frontend + BFF | Vercel |
| Database | Aurora PostgreSQL Serverless v2 |
| Video storage | S3 + CloudFront |
| AI | Amazon Bedrock |
| Auth | Amazon Cognito |
| Async jobs | Step Functions + Lambda + SQS |

## Local Development

```bash
npm install
cp .env.example .env.local
npm run dev
```

Without `DATABASE_URL`, the app runs with an in-memory mock store. Connect Aurora and AWS credentials for production behavior.
