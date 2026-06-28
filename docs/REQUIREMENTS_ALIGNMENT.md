# ChatPye Requirements Alignment

This document maps product requirements to the current `chatpye-landing` codebase and defines the build plan.

## Product pillars

### A — Rapid upskilling via video + AI

**Requirement:** Employees learn from self-uploaded or assigned videos. Chat, voice, code/segment extraction. Admins/HR assign courses. Training orgs sell courses on the platform.

| Capability | Current state | Target |
|------------|---------------|--------|
| Video upload | `/api/video/upload`, S3, WorkspaceShell | Keep; make upload the primary path |
| Custom video QA (RAG chat) | `/api/chat`, `/api/rag/query`, Lambdas, Bedrock | Keep; **no YouTube auto-transcript dependency** |
| Video processing pipeline | SQS/Lambda worker, Transcribe, embeddings | Wire fully to Aurora + Step Functions |
| Course creation | Drizzle `courses` schema only | Admin UI + API |
| Course assignment | Not built | `course_enrollments` table + HR assign flow |
| Training org marketplace | Stripe + pricing tiers exist | Course catalog with `providerName`, revenue share |
| Code/segment extraction | Snip, clip, chapters in workspace | Promote in chat responses with timestamp refs |

**Reuse:** `WorkspaceShell.tsx`, `VideoPlayer`, `/api/video/*`, `lambda-functions/chat`, `Hero` (simplified upload-first).

### B — Competency proof + viral HR hook

**Requirement:** Store learning events, projects, certifications, thinking throughput. Shareable public profile per course/skill. Hook for HR/manager signup when employee shares link.

| Capability | Current state | Target |
|------------|---------------|--------|
| Competency UI (landing) | `Competency.tsx` mock leaderboard | Wire to real assertions |
| Competency workspace | Nav link exists, **no route** | `/workspace/competencies` |
| Public profile | Drizzle `certificates.publicSlug` only | `/p/[slug]` shareable page |
| Learning events | Drizzle `learning_events` | Emit from chat, video complete, quiz |
| Assertions (CaSS-inspired) | Drizzle `assertions` | Issued on course completion + manager sign-off |
| Share → HR signup CTA | Not built | Profile footer: "Invite your manager" |

**Reuse:** `Competency.tsx` visual design, Drizzle schema, share patterns from `/api/chat/share`.

### C — Enterprise L&D (future employment)

**Requirement:** Companies use ChatPye for L&D; later employment signals. Landing hero should speak to this simply.

| Capability | Current state | Target |
|------------|---------------|--------|
| Org/tenant model | Clerk metadata + MongoDB tenants | Aurora `organizations` + roles |
| HR dashboard | Admin routes exist | Manager/HR competency views |
| SSO | Clerk supports SSO | Enterprise tier |
| Employment signals | Not built | Phase 3 — exportable competency records |

**Reuse:** `/dashboard`, admin RBAC, Stripe tiers, onboarding flows.

---

## Database decision

### Recommendation: **Amazon Aurora PostgreSQL** (primary)

| Option | Verdict | Why |
|--------|---------|-----|
| **Aurora PostgreSQL** | **Use now** | Relational org → user → course → video → competency graph. ACID for billing/enrollment. **pgvector** for video RAG. SQL reporting for HR dashboards. |
| Aurora DSQL | Phase 3+ | When Fortune 500 needs multi-region active-active. PostgreSQL-compatible migration path. |
| DynamoDB | Supplement only | High-volume event streams (optional). Poor fit for joins across competencies, courses, assertions. |

**Hybrid (later):** Aurora for domain data; DynamoDB for raw event firehose if volume exceeds PostgreSQL comfort; S3 for video/transcripts.

---

## Architecture (target)

```
Users (Employee · Manager · HR · Trainer)
        │
        ▼
┌───────────────────────────────────────┐
│  Vercel — Next.js 15 App Router       │
│  Landing · Workspace · Dashboard      │
│  BFF API routes (/api/*)              │
└───────────────┬───────────────────────┘
                │
    ┌───────────┼───────────┬──────────────┐
    ▼           ▼           ▼              ▼
 Clerk       Aurora PG    Amazon S3    Amazon Bedrock
 (auth)      + pgvector   (videos)     (Claude + Titan)
                │
                ▼
         Step Functions pipeline
         Upload → Transcode → Transcribe
              → Chunk → Embed → Index
```

**Auth note:** Clerk is in production today. Cognito migration is optional Phase 2 if AWS-native SSO is required.

**Legacy:** MongoDB/DocumentDB still powers many API routes. Migrate route-by-route to Drizzle/Aurora.

---

## Custom video QA pipeline (no YouTube transcript)

YouTube auto-transcript is **not** a dependency. Supported paths:

1. **Upload** — User uploads MP4/MOV → S3 → AWS Transcribe → chunk → Bedrock embeddings → Aurora pgvector
2. **Manual transcript** — Upload `.vtt`/`.srt` alongside video (existing `/api/transcript`)
3. **YouTube (best-effort)** — Optional fallback in `src/lib/video/transcript.ts`; not marketed on landing

Chat flow: retrieve top-k segments → Bedrock Claude → response with timestamp citations + code blocks.

---

## Codebase map — what to keep

| Area | Path | Action |
|------|------|--------|
| Landing shell | `src/app/page.tsx`, `Header`, `Footer`, `Background` | Keep; simplify hero |
| Hero | `src/components/Hero.tsx` | **Simplify** — upload-first, L&D message |
| Competency section | `src/components/Competency.tsx` | Keep design; link to `/p/demo` |
| Workspace | `WorkspaceShell.tsx`, `/workspace/[videoId]` | Keep as core learner UX |
| Video APIs | `/api/video/*`, `/api/chat`, `/api/rag` | Keep; migrate persistence to Aurora |
| Lambdas | `lambda-functions/` | Keep; align with Step Functions |
| Drizzle schema | `src/lib/db/schema.ts` | Extend enrollments, modules |
| Stripe/billing | `/api/billing`, Stripe webhooks | Keep for marketplace |
| Admin | `/api/admin/*`, dashboard | Keep for HR phase |

| Deprioritize | Reason |
|--------------|--------|
| YouTube-first hero UX | Policy + product direction |
| `YouTubeChat` on landing | Replace with upload demo or remove |
| MongoDB new features | Aurora only for new tables |

---

## Implementation phases

### Phase 1 — End-to-end MVP (weeks 1–4)

- [x] Base: chatpye-landing in workspace
- [x] Aurora Drizzle schema (core entities)
- [ ] Simplified landing hero (upload-first)
- [ ] Public competency profile `/p/[slug]`
- [ ] Workspace competencies page
- [x] Wire video upload → processing → chat on Aurora (replace Mongo for videos)
- [ ] Learning events emitted from chat + video complete (partial — upload/process/chat wired)
- [ ] Deploy: Vercel + Aurora Serverless v2 + S3 + Bedrock

### Phase 2 — B2B L&D (weeks 5–8, in progress)

- [x] Org admin: create courses, assign to teams (by email)
- [x] HR/manager dashboard: team progress + activity (`/dashboard/hr`)
- [x] Course management UI (`/dashboard/courses`)
- [x] Employee assigned courses (`/workspace/courses`)
- [ ] Course completion → assertion + certificate + public slug
- [ ] "Invite manager" viral flow on public profiles
- [ ] Training org: publish course to marketplace, Stripe checkout

### Phase 3 — Scale (weeks 9+)

- [ ] SSO (Clerk Enterprise or Cognito)
- [ ] CaSS-compatible assertion export
- [ ] Analytics + employment signals
- [ ] Aurora DSQL evaluation for multi-region
- [ ] DynamoDB event stream (optional)

---

## Environment checklist

```bash
cp env.example .env.local
# Required for full stack:
# NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY, CLERK_SECRET_KEY
# DATABASE_URL (Aurora PostgreSQL)
# AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_S3_BUCKET
# STRIPE_* (billing)
```

```bash
npm run dev          # Local
npm run db:push      # Push Drizzle schema to Aurora
npm run build        # Production build (needs real Clerk keys)
```

---

## Success criteria (MVP)

1. Employee uploads a training video → processing completes → can chat with AI about content with timestamp refs
2. Completing learning generates a competency record
3. Employee shares `/p/[slug]` — HR sees verified skills + signup CTA
4. Admin assigns a course to an employee (Phase 2)
5. Beautiful UI: existing landing + workspace aesthetic preserved
