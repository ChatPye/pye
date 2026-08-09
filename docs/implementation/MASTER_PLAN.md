# ChatPye Workspace — Master Development Plan

**Status:** Approved  
**Version:** 1.2  
**Date:** 9 August 2026  
**Approved by:** Product owner  
**Approval date:** 4 August 2026  
**Baseline commit:** `27fb344c95aab90fdc126eb9b5822f06b67a637d`  
**Owner:** Pye Interactive Limited

This is the **single tracking document** for end-to-end delivery. Update task statuses here and in `docs/implementation/STATUS.md` after each slice. Do not mark a row **Done** until it meets the [Definition of Done](#definition-of-done).

---

## 1. Product north star

**ChatPye** helps employees learn, apply work, and prove competence with evidence they control. **SkillProof** is the evidence and competency capability inside ChatPye — not a separate product.

**Launch proposition:** ChatPye turns learning plans, tutorials and real work into evidence employees can use in performance reviews — and managers can trust.

---

## 2. What changed from the initial ADR (please approve)

The first architecture draft (ADR-004) said:

| Original (incorrect for our cost model) | Revised (proposed) |
|----------------------------------------|---------------------|
| Gemini = YouTube **structured analysis only** | Gemini = **all YouTube learning AI** |
| Bedrock = Pye **chat/tutor** for every resource | Gemini = Pye **chat/tutor** when resource is **public YouTube** |
| Bedrock = default chat spend path | Bedrock = **paid custom video** + **workforce agents** only |

### What “Wire Bedrock tutor adapter to `/api/chat` RAG” meant

That was engineering shorthand for: connect the new `BedrockTutorProvider` stub to the **existing** Bedrock chat route (`src/app/api/chat/route.ts`), which today does transcript RAG + Claude for uploaded videos.

**Under the revised strategy we do not wire Bedrock for YouTube chat.** Instead:

1. **YouTube workspace chat** → new **`/api/pye/chat`** (or extend chat router) → **Gemini Interactions** with the YouTube URL (or cached analysis artefact) in context.
2. **Custom upload workspace chat** → existing **Bedrock RAG** path (Transcribe → chunks → Titan embeddings → Claude).
3. **Workforce agents** (Growth Plan draft, evidence analysis, review summaries) → **Bedrock** always.

This preserves your ability to scale free-tier YouTube acquisition on Gemini’s preview YouTube URL capability while keeping AWS spend for revenue-bearing uploads and B2B workflows.

---

## 3. AI provider routing (proposed — approve Section 3)

### 3.1 Routing matrix

| User action | Resource type | AI provider | Input method |
|-------------|---------------|-------------|--------------|
| Import & analyse YouTube | `youtube` | **Gemini** | YouTube URL in Interactions API |
| Pye chat in YouTube workspace | `youtube` | **Gemini** | YouTube URL + conversation + structured artefact |
| Quiz / flashcards / chapters | `youtube` | **Gemini** | Same URL or cached JSON artefact |
| Import custom video | `video_upload` (Pro+) | **AWS Transcribe** + **Bedrock** | S3 → transcript → RAG |
| Pye chat for custom video | `video_upload` | **Bedrock Claude** | Retrieved transcript segments |
| PDF learning | `pdf` (Pro+) | **Gemini File API** or Textract + Bedrock (TBD in M2) | File upload |
| Web URL learning | `web_url` | Bedrock + sanitised extract (M2) | SSRF-safe fetch |
| Growth Plan AI draft | N/A | **Bedrock** | Plan context |
| Evidence AI analysis | N/A | **Bedrock** | Rubric + submission |
| Review meeting summary | N/A | **Bedrock** | Objectives + evidence + notes |
| Competency assertion draft | N/A | **Bedrock** | Evidence bundle |

### 3.2 Gemini YouTube implementation (per Google docs)

Reference: [Gemini video understanding](https://ai.google.dev/gemini-api/docs/video-understanding)

| Phase | Gemini input method | When |
|-------|---------------------|------|
| **M1 — Public YouTube** | `{ type: "video", uri: "https://www.youtube.com/watch?v=..." }` | Import, chat, re-analysis |
| **M2 — Paid custom video (optional path)** | File API upload → `{ type: "video", uri: file.uri }` | Only if we choose Gemini for paid video later; **default remains Bedrock** per your direction |

**Rules:**

- Never download or rehost YouTube files (`ytdl-core` removed).
- Use official YouTube embed player in UI.
- Treat YouTube URL feature as **preview**: feature flag + daily quota + circuit breaker.
- Cache **our generated JSON artefacts** (chapters, quiz, summary) in Aurora — not the video.
- Free tier: respect ~8 hours YouTube/day platform limit; enforce per-user caps below that.

### 3.3 Cost controls

| Control | YouTube (Gemini) | Custom video (Bedrock) | Agents (Bedrock) |
|---------|------------------|------------------------|------------------|
| Per-user daily cap | Yes (e.g. 3 Free / 20 Pro analyses) | Upload minutes/month by plan | Token budget by plan |
| Platform circuit breaker | Disable `FEATURE_GEMINI_YOUTUBE` | Concurrency limit on workers | Org-level token pool |
| Commercial pricing | Independent of “free preview” assumption | Usage-metered | Included in Team/Enterprise |

### 3.4 Code structure (provider abstraction)

```
src/lib/ai/
  router.ts              # routeByResourceType(resource) → provider
  providers/
    gemini-youtube.ts    # analysis + chat + study generation for YouTube
    bedrock-upload.ts    # RAG chat for custom uploads
    bedrock-agents.ts    # plans, evidence, reviews
  schemas/
    resource-analysis.ts # Zod — shared output shape regardless of provider
```

**Implementation note:** The repo already uses Gemini Interactions in `transcript.ts` and `gemini-study.ts`. M1 consolidates these into `gemini-youtube.ts` and adds **streaming chat** for YouTube.

---

## 4. Competency model — CASS-aligned (proposed — approve Section 4)

Reference: [CaSS Project](https://www.cassproject.org/) · [CaSS schema](http://schema.cassproject.org/) · [Assertion processing](https://cass.credentialengine.org/docs/guide/assertion-processing/)

CaSS separates **competency definitions**, **assertions** (claims), and **evidence** (proof). ChatPye/SkillProof follows this without running a full CaSS server.

### 4.1 Entity mapping

| CaSS concept | ChatPye entity | Purpose |
|--------------|----------------|---------|
| Framework | `competency_frameworks` | Org or system skill taxonomy |
| Competency | `competencies` | Skill/knowledge unit with global-friendly ID |
| Relation | `competency_relationships` | `requires`, `narrows`, `equivalent`, etc. |
| Level | `competency_levels` | Performance levels within a competency |
| RollupRule | `competency_rollup_rules` | Infer parent competency from children (M4+) |
| Assertion | `assertions` | Claim: subject + competency + level + confidence |
| Evidence | `evidence` + `evidence_files` | Proof linked to assertion (not conflated with notes/chat) |
| Profile | `learner_profiles` | Computed view of held competencies |
| Reviewer decision | `assertion_reviews` | Human accept / revise / decline |

### 4.2 Every assertion must answer

| Question | Field / UI |
|----------|------------|
| What was demonstrated? | `assertion.statement` |
| Which competency & level? | `competency_id`, `level_id` |
| What evidence supports it? | `evidence_ids[]` |
| How was it assessed? | `assessment_method` (ai_draft, manager_review, quiz, …) |
| Limitations? | `limitations` |
| AI confidence? | `ai_confidence` (0–1, not a hiring score) |
| Human reviewed? | `assertion_reviews.outcome` |
| Who can see it? | `visibility` enum |
| Revalidation date? | `expires_at` |

### 4.3 Assertion lifecycle (SkillProof)

```text
Evidence: draft → submitted → analysing → ready_for_review
Assertion: ai_draft → employee_review → shared → under_review → accepted | revision_requested | declined | withdrawn
Profile:   updated only when assertion accepted (or configured rollup)
```

**Principles from CaSS we adopt:**

- Never treat chat or private notes as manager-visible evidence without explicit submission.
- High-impact assertions require human review before org visibility.
- Conflicting assertions resolved by documented rules (reviewer wins over AI draft).
- No unexplained “employability score” or personality inference.

### 4.4 Future interoperability (M6+)

- Export assertions as JSON-LD aligned to CaSS schema URIs.
- Optional CTDL / Open Badges adapters — not MVP.

---

## 5. Application architecture summary

| Layer | Choice |
|-------|--------|
| Frontend | Next.js 15, Midnight Studio design system |
| Auth | Clerk (+ org webhooks → Aurora) |
| Database | Aurora PostgreSQL + Drizzle |
| Object storage | S3 (uploads, evidence) |
| Queue | SQS + DLQ |
| YouTube AI | Gemini Interactions API |
| Upload AI | Bedrock Claude + Titan embeddings |
| Workforce AI | Bedrock Claude |
| Billing | Stripe |
| Production host | ECS Fargate + CloudFront (M5); Vercel previews until then |

---

## 6. Milestones — full tracker

Status key: `⬜ Not started` · `🔄 In progress` · `✅ Done` · `⏸ Blocked`

### Milestone 0 — Audit & foundation

| ID | Task | Status | Owner |
|----|------|--------|-------|
| M0.1 | Baseline audit | ✅ Done | Eng |
| M0.2 | ADRs + architecture docs | ✅ Done | Eng |
| M0.3 | Design system doc + tokens | ✅ Done | Eng |
| M0.4 | Jest + CI (lint, test, build) | ✅ Done | Eng |
| M0.5 | API error envelope + request context | ✅ Done | Eng |
| M0.6 | **Master plan approved** | ✅ Done | Product |

**Exit:** You approve Sections 3–4 of this document.

---

### Milestone 0.5 — Infrastructure & portability (gate before M1.6)

| ID | Task | Status |
|----|------|--------|
| I0.1 | Monorepo `apps/` + `packages/` scaffold | ✅ Done |
| I0.2 | `@chatpye/ai-core` + `@chatpye/ai-providers` | ✅ Done |
| I0.3 | OpenTofu modules + staging/production roots | ✅ Done (validate only) |
| I0.4 | Portable DB schema (`ai_jobs`, `audit_events`) | ✅ Done |
| I0.5 | Architecture + runbook docs (10 documents) | ✅ Done |
| I0.6 | ADRs 007–010 | ✅ Done |
| I0.7 | Wire app to packages (incremental) | ✅ Done |
| I0.8 | CodePipeline deploy stage + ECS task defs | ⬜ Operator approval required |

**Exit:** `npm run infra:validate:staging` passes; docs reviewed; operator approves first `tofu apply`.

---

### Milestone 1 — Personal YouTube learning loop (Gemini-first)

**Journey A:** Sign up → paste YouTube → process → learn → chat → quiz → evidence → Growth Record.

| ID | Task | Status | Notes |
|----|------|--------|-------|
| M1.1 | Resource types + state machine | ✅ Done | `src/lib/resources/` |
| M1.2 | Zod structured analysis schema | ✅ Done | `src/lib/ai/schemas/` |
| M1.3 | **`gemini-youtube` provider** (analysis) | ✅ Done | Consolidated in `gemini-youtube.ts` |
| M1.4 | **`gemini-youtube` provider** (Pye chat) | ✅ Done | YouTube URL multimodal chat |
| M1.5 | Chat API router by `resource.sourceType` | ✅ Done | `resolve-chat-provider.ts` + `/api/chat` |
| M1.6 | Drizzle: `resources`, `resource_processing_jobs` | ✅ Done | Migrate from `videos` |
| M1.7 | Import API → queue → worker → `ready` | ✅ Done | Async, not blocking HTTP |
| M1.8 | `/app/import` dedicated UI | ⬜ Not started | Replace redirect stub |
| M1.9 | Workspace consumes structured artefact | ⬜ Not started | Chapters, tasks, quiz |
| M1.10 | Notes, bookmarks, quiz attempts persisted | ⬜ Not started | Aurora |
| M1.11 | Evidence submit → **draft assertion** (CaSS fields) | ⬜ Not started | Employee-private default |
| M1.12 | `/app/growth-record` | ⬜ Not started | Profile view |
| M1.13 | UI primitives (Button, Card, states) | ⬜ Not started | Midnight Studio |
| M1.14 | Remove in-memory video fallbacks | ⬜ Not started | `requireAurora` enforced |
| M1.15 | Tests: Gemini schema, routing, ownership | 🔄 In progress | 18 tests pass |
| M1.16 | Gemini quota + circuit breaker | ⬜ Not started | Feature flag |

**Exit demo:** Employee pastes YouTube URL → Pye answers with timestamp citation via **Gemini** → quiz → evidence → draft assertion in Growth Record.

---

### Milestone 2 — PDF & paid custom video (Bedrock path)

| ID | Task | Status |
|----|------|--------|
| M2.1 | Stripe entitlement gates (Pro upload) | ⬜ |
| M2.2 | S3 multipart presigned upload | ⬜ |
| M2.3 | Transcribe → chunk → Bedrock embed → RAG | ⬜ |
| M2.4 | Pye chat for uploads via **Bedrock only** | ⬜ |
| M2.5 | PDF ingest (validate, extract, render) | ⬜ |
| M2.6 | Usage metering + failure/retry UX | ⬜ |

---

### Milestone 3 — Organisations & Growth Plans

| ID | Task | Status |
|----|------|--------|
| M3.1 | Clerk webhooks → users/orgs/memberships | ⬜ |
| M3.2 | Application RBAC (`docs/security/RBAC_MATRIX.md`) | ⬜ |
| M3.3 | `/org/[orgSlug]/*` routes | ⬜ |
| M3.4 | Growth Plan CRUD + SMART objectives | ⬜ |
| M3.5 | Assign resources; **Bedrock** plan draft | ⬜ |
| M3.6 | Employee consent + accept/decline | ⬜ |
| M3.7 | 30/60/90-day review schedule | ⬜ |
| M3.8 | Learning Pods | ⬜ |

---

### Milestone 4 — SkillProof review (CaSS assertions)

| ID | Task | Status |
|----|------|--------|
| M4.1 | Evidence lifecycle UI (all states) | ⬜ |
| M4.2 | **Bedrock** evidence analysis → draft assertion | ⬜ |
| M4.3 | Manager review queue | ⬜ |
| M4.4 | Competency frameworks + relations | ⬜ |
| M4.5 | Assertion reviews + audit events | ⬜ |
| M4.6 | Performance review summary | ⬜ |
| M4.7 | Growth Record updates on acceptance | ⬜ |

---

### Milestone 5 — Billing & production

| ID | Task | Status |
|----|------|--------|
| M5.1 | Stripe Free / Pro / Team / Enterprise | ⬜ |
| M5.2 | AWS CDK + ECS Fargate production | ⬜ |
| M5.3 | Security test matrix | ⬜ |
| M5.4 | E2E Playwright (Journeys A–D) | ⬜ |
| M5.5 | Accessibility WCAG 2.2 AA review | ⬜ |
| M5.6 | Backups, alarms, cost dashboards | ⬜ |

---

### Milestone 6 — Pye Desktop boundary

| ID | Task | Status |
|----|------|--------|
| M6.1 | Desktop session API contract | ⬜ |
| M6.2 | Deep link + task context payload | ⬜ |
| M6.3 | Evidence return + consent model | ⬜ |

---

## 7. Route map

| Target route | Milestone | Baseline |
|--------------|-----------|----------|
| `/app/import` | M1 | Redirect stub |
| `/app/workspace/[resourceId]` | M1 | Redirect to `/workspace` |
| `/app/growth-record` | M1 | Aliases competencies page |
| `/org/[orgSlug]/plans` | M3 | `/dashboard/courses` partial |
| `/features`, `/security`, … | M1–M2 | Missing |

---

## 8. Definition of done

A task is **Done** only when:

- [ ] Works in UI with real persisted data  
- [ ] Server-side auth + authorisation  
- [ ] Loading / empty / error / success states  
- [ ] Tests appropriate to risk  
- [ ] Documented in this plan + STATUS.md  
- [ ] Observable (request ID, metrics)  
- [ ] Idempotent mutations where needed  
- [ ] Keyboard accessible  
- [ ] No secrets or cross-tenant leakage  
- [ ] No placeholder/demo data in production paths  

---

## 9. Approval checklist

Please confirm:

- [x] **Section 3** — Gemini owns all YouTube AI (analysis + Pye chat + study tools); Bedrock for paid uploads + workforce agents  
- [x] **Section 4** — CaSS-aligned competency/evidence/assertion model  
- [x] **Section 6** — Milestone order and scope  
- [x] **Cost assumption** — YouTube URL preview pricing may change; product pricing stays independent  

**Approved by:** Product owner  
**Date:** 4 August 2026

---

## 10. Related documents

| Doc | Purpose |
|-----|---------|
| `docs/audit/BASELINE_AUDIT.md` | Baseline commit findings |
| `docs/implementation/STATUS.md` | Sprint-level status |
| `docs/architecture/AI_PIPELINE.md` | Technical AI detail (update after approval) |
| `docs/security/RBAC_MATRIX.md` | Permissions |
| `docs/adr/004-ai-provider-split.md` | Superseded by Section 3 when approved |

---

## Revision history

| Version | Date | Change |
|---------|------|--------|
| 1.1 | 2026-08-04 | Product owner approved Sections 3–6; M1.3–M1.5 implemented |
| 1.2 | 2026-08-09 | Milestone 0.5 infra scaffold: monorepo, OpenTofu, ai packages, docs |
