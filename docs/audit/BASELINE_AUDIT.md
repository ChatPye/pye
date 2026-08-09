# ChatPye Workspace — Baseline Audit

**Audit date:** 4 August 2026  
**Repository:** [ChatPye/chatpye-web](https://github.com/ChatPye/chatpye-web)  
**Baseline commit:** `27fb344c95aab90fdc126eb9b5822f06b67a637d`  
**Commit message:** Allow SkillProof demo video and surface quota errors  
**Auditor scope:** Milestone 0 — full repository read, design review, build verification

---

## Executive summary

The repository is a **working Next.js 15 prototype** branded as “SkillProof Studio by ChatPye”. It delivers a credible learner workspace (video upload/YouTube, AI chat, quizzes, flashcards, SkillProof task panels, competency stubs, HR/course assignment, pods, Stripe billing) but is **not production-ready** for multi-tenant workforce learning on AWS.

Primary gaps versus the master implementation prompt:

| Area | Baseline state | Target state |
|------|----------------|--------------|
| Deployment | Vercel-first (`vercel.json`, deploy docs) | AWS ECS Fargate + CloudFront + Aurora |
| Data layer | Dual MongoDB legacy + Aurora Drizzle + in-memory fallbacks | Aurora PostgreSQL only, typed migrations |
| Auth/RBAC | Clerk sessions; admin via hardcoded emails + Clerk metadata | Clerk orgs + application permission tables |
| Resource model | `videos` table, upload-centric | Canonical `resources` (YouTube, PDF, URL, video) |
| YouTube AI | Gemini transcript fallback + caption scraping; `ytdl-core` present | Direct Gemini URL analysis, no rehost/download |
| Routes | `/workspace`, `/dashboard/hr` | `/app/*`, `/org/[orgSlug]/*` |
| Tests/CI | 1 test file (broken Jest config); CI = type-check + build only | Full lint, unit, integration, security scans |
| Design system | Partial Tailwind + hackathon docs | Midnight Studio tokens from `design.md` |
| Infrastructure | No `infra/` directory | AWS CDK (recommended) |

**Recommendation:** Incremental vertical slices. Preserve `WorkspaceShell` and Drizzle schema as foundations; replace fragile persistence, auth boundaries, and deployment assumptions milestone by milestone.

---

## Repository structure

```
chatpye-web/
├── design.md                    # Added at audit — ChatPye Midnight Studio tokens (from approved prototypes)
├── src/
│   ├── app/                     # Next.js App Router — 58 static pages at build
│   ├── components/              # Workspace, landing, dashboard UI
│   ├── lib/                     # Auth, DB, AI, video, billing, security
│   ├── services/                # Video processor workers, LLM, vector search
│   ├── data/                    # Legacy Mongoose models + in-memory stores
│   └── middleware.ts            # Clerk + security headers
├── lambda/video-preprocess/     # AWS Lambda for upload preprocessing
├── scripts/deploy/              # PowerShell AWS setup helpers
├── docs/                        # Architecture, deploy, hackathon evidence
└── .github/workflows/           # ci.yml, deploy-vercel.yml
```

**External design assets (workspace parent):** `../stitch_skillproof_studio/` — HTML prototypes for all target screens (landing, workspace, growth plan, evidence review, org dashboard). These are reference-only; not wired to the app.

---

## Framework and tooling

| Item | Version / detail |
|------|------------------|
| Runtime | Node 20.x required (local audit ran on Node 24 — engine warning) |
| Framework | Next.js 15.5.19, React 19, App Router |
| Styling | Tailwind CSS 3.4, custom `globals.css` |
| ORM | Drizzle ORM 0.45 + `postgres` driver |
| Auth | `@clerk/nextjs` 5.x |
| Payments | Stripe 14.x |
| AI | AWS Bedrock (Claude, Titan embeddings), Gemini Interactions API |
| Queue | SQS consumer in `src/services/video-processor/` |
| Tests | Jest 29 (misconfigured), Playwright devDependency (no suites found) |
| Lint | ESLint 8 + `eslint-config-next` |

---

## Verification results (baseline commit)

Run on Windows, Node v24.15.0, with placeholder Clerk keys and `SKIP_ENV_VALIDATION=true`:

| Check | Result | Notes |
|-------|--------|-------|
| `npm install` | Pass | 1038 packages; deprecated deps (eslint 8, glob 7) |
| `npm run type-check` | **Pass** | `tsc --noEmit` clean |
| `npm run build` | **Pass** | 58 routes compiled |
| `npm run lint` | **Fail** | 15 errors, 315 warnings (330 total) |
| `npm test` | **Fail** | Jest cannot parse TypeScript / ESM imports |

**Lint errors (representative):**

- `react-hooks/rules-of-hooks` in `admin/page.tsx`, `services/video-processor/worker.ts` (`useAuroraForVideos` misnamed helper)
- Additional hook violations across admin and workspace components

**CI gap:** `.github/workflows/ci.yml` runs only type-check and build — lint and tests are not enforced.

---

## Existing capabilities

### What works (exercisable with credentials)

1. **Authentication** — Clerk sign-in/sign-up, middleware protection for `/workspace`, `/dashboard`, admin routes.
2. **Learner workspace** — `WorkspaceShell.tsx` (~3k lines): video player, chapters, Pye chat, notes, bookmarks, quizzes, flashcards, SkillProof task panel, community threads, resource list.
3. **Video pipeline** — S3 presigned upload, processing tick/worker routes, AWS Transcribe, chapter generation, status SSE stream.
4. **YouTube** — URL import, caption transcript via `@danielxceron/youtube-transcript`, Gemini fallback for uncaptioned public videos (`src/lib/video/transcript.ts`).
5. **AI chat** — `/api/chat` with Bedrock RAG, timestamp citations, code extraction.
6. **SkillProof** — Task plan generation (`/api/skillproof/task-plan`), evidence submission, repo assessment stub.
7. **Competency** — Drizzle tables + `/workspace/competencies`, public profile `/p/[slug]`.
8. **Organisation (partial)** — Courses, enrollments, HR dashboard `/dashboard/hr`, course admin `/dashboard/courses`.
9. **Pods** — Create, invite, share links (Aurora + memory fallback).
10. **Billing** — Stripe checkout + webhook route, plan tiers in `subscription-tiers.ts`.
11. **Sharing** — Video/chat share links, pod shares.
12. **Security middleware** — CSP, HSTS, rate limits, DDoS check hooks, bot detection.

### What is broken or unreliable

1. **Dual persistence** — Many routes fall back to in-memory Maps when `DATABASE_URL` unset; data lost on restart.
2. **MongoDB legacy** — `mongoose` still used in token-usage, sync-verification, DocumentDB connector; conflicts with Aurora migration goal.
3. **No Clerk webhooks** — Users/orgs not synchronised into application DB; identity drift risk.
4. **Jest** — No `jest.config`; tests cannot run.
5. **Admin platform** — Hardcoded admin emails in `auth.ts`; roles stored in Clerk `public_metadata` (client-visible).
6. **DEV_AUTH_BYPASS** — Can bypass all auth when env var set; must be blocked in production builds.
7. **PDF import** — UI mentions PDF support; no server-side PDF ingestion pipeline found.
8. **Growth Plans / reviews** — No 30/60/90-day plan entities, review workflow, or evidence-review queue.
9. **Route mismatch** — Target `/app`, `/org`, `/features`, `/security` routes absent.
10. **Documentation conflict** — `DEPLOYMENT_ARCHITECTURE.md` references CockroachDB; `ARCHITECTURE.md` and schema target Aurora.

### Hackathon / demo artefacts to replace

| Artefact | Location | Action |
|----------|----------|--------|
| Demo transcript API | `/api/demo-transcript` | Remove from production paths |
| XP / gamification | `xp-system.ts`, `/api/xp`, `user_xp` table | Deprecate — conflicts with brand direction |
| PyeLab page | `/pyelab` | Extension sandbox; keep behind flag or remove |
| `debug-env` | `/debug-env` | Remove before production |
| Memory stores | `videoMemoryStore`, `pod-repository` memory | Replace with Aurora-only |
| `ytdl-core` dependency | `package.json` | Remove — YouTube ToS risk; use embed + Gemini URL |
| SkillProof as separate brand in README | `README.md` | Rebrand to ChatPye Workspace |
| CockroachDB plan | `DEPLOYMENT_ARCHITECTURE.md` | Supersede with Aurora ADR |

---

## Security concerns

| Risk | Severity | Detail |
|------|----------|--------|
| Tenant isolation | **High** | Not all queries filter by `orgId`; clerk ID used directly without membership verification on several routes |
| IDOR | **High** | Video/pod/share access must be audited route-by-route |
| DEV_AUTH_BYPASS | **Critical** if enabled in prod | Full auth bypass |
| Admin authorisation | **High** | Email allowlist + Clerk public_metadata roles |
| No Clerk webhook verification | **High** | Missing sync and signature validation |
| In-memory share stores | **Medium** | `server/memory/videoShares.ts` — not durable, not tenant-safe |
| CSP | **Medium** | `unsafe-inline`, `unsafe-eval` allowed |
| Bot detection | **Low** | Blocks curl/postman in production middleware — impedes monitoring |
| Payment recovery | **Medium** | In-memory Map in `error-handling.ts` |
| Secrets in docs | **Low** | Example env only; verify no real keys committed |
| Prompt injection | **Medium** | Imported transcripts/HTML not sandboxed in AI prompts |
| SSRF | **Not implemented** | Web URL import not built; must block private ranges when added |

---

## Technical debt

1. **Monolithic WorkspaceShell** — 3k lines; needs panel extraction and design-system primitives.
2. **No shared UI kit** — No `components/ui/`; inconsistent buttons, inputs, states.
3. **Route sprawl** — 100+ API routes; many overlapping (`/api/chat` vs `/api/rag/query`).
4. **Naming confusion** — `useAuroraForVideos` is not a React hook; triggers lint false positive.
5. **react-router-dom** — Listed dependency; Next.js App Router used instead (dead dep).
6. **Engine pin** — Node 20.x required but not enforced in CI beyond setup-node.
7. **No IaC** — AWS setup via PowerShell scripts only.
8. **Observability** — Logger exists; no request IDs, trace propagation, or redaction policy enforced.
9. **Entitlements** — Plan checks scattered; no central server-side entitlement service.

---

## Reusable components

| Component / module | Reuse strategy |
|--------------------|----------------|
| `WorkspaceShell.tsx` | Refactor into panels; keep behaviour |
| `VideoPlayer`, `StudyPanel`, `SkillProofTaskPanel` | Align to design system tokens |
| `src/lib/db/schema.ts` | Extend toward target data model |
| `src/lib/video/transcript.ts` | Basis for Gemini YouTube provider |
| `src/lib/bedrock-invoke.ts`, `/api/chat` | Bedrock provider for Pye agents |
| `src/lib/learning/gemini-study.ts` | Quiz/flashcard generation patterns |
| `src/lib/security.ts` | Harden and extend rate limits |
| `src/lib/skillproof/task-plan.ts` | Task/evidence generation |
| `src/middleware.ts` | Extend route protection for `/app`, `/org` |
| Stripe webhook handler | Extend for Team/Enterprise entitlements |
| HR dashboard pages | Migrate to `/org/[slug]` |
| Drizzle repositories | Pattern for new entities |

---

## Data model gaps (vs target schema)

**Present (partial):** users, organizations, courses, videos, competencies, assertions, certificates, learning_events, pods, share_links, bookmarks, notes, quizzes, flashcards, chat_sessions, learner_competencies.

**Missing or incomplete:**

- `organisation_memberships`, `application_roles`, `permissions`
- `plans`, `plan_members`, `objectives`, `review_periods`, `reviews`
- Canonical `resources`, `resource_processing_jobs`, `resource_chapters`
- `learning_tasks`, `task_progress`
- `evidence`, `evidence_files`, `assertion_reviews`
- `competency_frameworks`, `competency_relationships`, `competency_levels`
- `invitations`, `subscriptions`, `usage_events`, `webhook_events`, `audit_events`
- `data_retention_policies`

**Migration approach:** Evolve `videos` → `resources` with a compatibility view; add processing job table; introduce RBAC tables before org features ship.

---

## Route inventory

### Current public routes

`/`, `/pricing`, `/privacy`, `/terms`, `/sign-in`, `/sign-up`, `/p/[slug]`, `/shared/[shareId]`, `/enterprise`, `/onboarding/*`

### Current app routes

`/workspace`, `/workspace/[videoId]`, `/workspace/courses`, `/workspace/competencies`, `/dashboard/hr`, `/dashboard/courses`, `/pods/*`, `/billing`

### Target routes (master prompt)

Public: `/features`, `/for-employees`, `/for-managers`, `/security`, `/share/[token]`  
Personal: `/app/*`  
Organisation: `/org/[orgSlug]/*`

**Strategy:** Introduce `/app` as alias with redirects from `/workspace` (ADR-005). Build `/org/[orgSlug]` alongside existing dashboard routes; deprecate after parity.

---

## AI pipeline baseline

| Provider | Current use | Target use |
|----------|-------------|------------|
| Gemini | YouTube transcript fallback, quiz/flashcards from transcript text | **Primary for public YouTube** — structured analysis (chapters, objectives, quiz, competencies) via URL |
| Bedrock Claude | Chat tutor, summaries, task plans, competency analysis | **Primary for Pye agents** — chat, review, plan drafting, evidence analysis |
| Bedrock Titan | Embeddings for RAG | Keep for upload RAG; evaluate need for YouTube |
| AWS Transcribe | Upload transcription | Keep for custom video / PDF OCR path |
| `ytdl-core` | Present in dependencies | **Remove** |

---

## Proposed migration plan

### Phase 0 — Foundation (this milestone)

- [x] Baseline audit (this document)
- [ ] Design system tokens (`docs/design/DESIGN_SYSTEM.md`)
- [ ] ADRs: Aurora, AWS CDK, ECS deployment, RBAC model, route migration
- [ ] Fix Jest config; extend CI (lint, test, secret scan placeholders)
- [ ] Request context + API error envelope
- [ ] Copy `design.md`; align branding docs

### Phase 1 — Personal YouTube loop

- Resource processing state machine + Gemini structured output schema
- AI provider abstraction (`GeminiVideoProvider`, `BedrockAgentProvider`)
- Persist resources in Aurora; async job queue
- Workspace wired to real data; Growth Record MVP
- Remove in-memory fallbacks from video paths

### Phase 2 — PDF + paid upload

- S3 presigned multipart, malware scan hook, entitlements
- PDF text extraction + safe renderer

### Phase 3 — Organisations + Growth Plans

- Clerk org webhooks → DB sync
- RBAC tables + server-side checks
- Growth Plan CRUD, assignments, visibility notices

### Phase 4 — SkillProof review

- Evidence lifecycle, assertion reviews, audit log

### Phase 5 — Billing + AWS production

- Stripe plan matrix (Free/Pro/Team/Enterprise)
- CDK stacks: VPC, ECS, Aurora, SQS, CloudFront, WAF

### Phase 6 — Pye Desktop boundary

- API contracts only; no autonomous control

---

## Baseline commit preservation

To reproduce this audit:

```bash
git checkout 27fb344c95aab90fdc126eb9b5822f06b67a637d
npm ci
SKIP_ENV_VALIDATION=true \
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_ci_placeholder \
CLERK_SECRET_KEY=sk_test_ci_placeholder \
npm run type-check && npm run build
```

---

## Sign-off

This audit confirms the repository is a **strong UX and pipeline starting point**, not a shippable multi-tenant product. Milestone 1 should focus on the **personal YouTube learning loop** with real persistence, Gemini structured analysis, and design-system alignment — without rewriting the workspace from scratch.
