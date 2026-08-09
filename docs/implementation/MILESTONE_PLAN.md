# Milestone Implementation Plan

Sequential execution until launch definition-of-done is met. Each milestone ends with verification report in `docs/implementation/STATUS.md`.

---

## Milestone 0 — Audit & foundation

**Goal:** Understand baseline; establish docs, CI, observability, design tokens.

| # | Work item | Status |
|---|-----------|--------|
| 0.1 | Baseline audit (`docs/audit/BASELINE_AUDIT.md`) | Done |
| 0.2 | ADRs (CDK, Aurora, ECS, AI split, routes, RBAC) | Done |
| 0.3 | Design system doc + `design.md` in repo | Done |
| 0.4 | Architecture docs (system, data, AI, AWS) | Done |
| 0.5 | Security docs (RBAC, threat, privacy) | Done |
| 0.6 | Jest configuration + CI lint/test | In progress |
| 0.7 | API error envelope + request context | In progress |
| 0.8 | `.env.example` alignment | In progress |

**Exit criteria:** Build passes; docs complete; CI runs lint + tests; no blockers for M1.

---

## Milestone 1 — Personal YouTube learning loop

**Goal:** Journey A end-to-end on real persisted data.

| # | Work item |
|---|-----------|
| 1.1 | Resource types + processing state machine module |
| 1.2 | AI provider abstraction + Gemini structured schema (Zod) |
| 1.3 | `resources` + `resource_processing_jobs` schema migration |
| 1.4 | YouTube import API → queue → worker → `ready` |
| 1.5 | `/app` routes (alias workspace) + import page |
| 1.6 | Workspace panels consume structured artefact |
| M1.7 | Pye chat (**Gemini** for YouTube) with chapter citations | ⬜ Not started |
| 1.8 | Notes, bookmarks, quiz attempts persisted |
| 1.9 | Evidence submission → draft assertion |
| 1.10 | Growth Record page (`/app/growth-record`) |
| 1.11 | UI primitives + midnight tokens in workspace |
| 1.12 | Unit tests: schema, state transitions, permissions |
| 1.13 | Remove in-memory fallback from video import path |

**Exit criteria:** Demo script: sign up → paste YouTube → wait for ready → chat with citation → quiz → evidence → growth record entry.

---

## Milestone 2 — PDF & paid upload

| # | Work item |
|---|-----------|
| 2.1 | Entitlement service (Stripe plan gates) |
| 2.2 | S3 presigned multipart upload |
| 2.3 | PDF validation, text extract, safe render |
| 2.4 | Custom video pipeline + usage metering |
| 2.5 | Worker retry UX + DLQ handling |

---

## Milestone 3 — Organisations & Growth Plans

| # | Work item |
|---|-----------|
| 3.1 | Clerk org webhooks → DB sync |
| 3.2 | RBAC tables + `authorize()` middleware |
| 3.3 | `/org/[orgSlug]/*` routes |
| 3.4 | Growth Plan CRUD + SMART objectives |
| 3.5 | Employee invitation + visibility notice + accept/decline |
| 3.6 | Review schedule (30/60/90 day) |
| 3.7 | Learning Pods (migrate existing pods) |

---

## Milestone 4 — SkillProof review

| # | Work item |
|---|-----------|
| 4.1 | Evidence lifecycle UI + states |
| 4.2 | AI evidence analysis → draft assertion |
| 4.3 | Manager review queue + decisions |
| 4.4 | Competency frameworks |
| 4.5 | Performance review summary |
| 4.6 | Audit log |

---

## Milestone 5 — Billing & production hardening

| # | Work item |
|---|-----------|
| 5.1 | Stripe plans: Free/Pro/Team/Enterprise |
| 5.2 | AWS CDK stacks + ECS deploy |
| 5.3 | Security test matrix |
| 5.4 | Backups, alarms, cost controls |
| 5.5 | Accessibility audit |
| 5.6 | E2E suite (Playwright) |

---

## Milestone 6 — Pye Desktop boundary

Documentation + API contracts only:

- Desktop session API
- Deep links
- Task context payload
- Evidence return contract
- Consent model
- Capability registry (Excel, VS Code)

---

## Route migration schedule

| Phase | Routes |
|-------|--------|
| M1 | `/app`, `/app/import`, `/app/workspace/[id]`, `/app/growth-record` |
| M1 | Marketing: `/features`, `/for-employees`, `/for-managers`, `/security` |
| M3 | `/org/[orgSlug]/*` |
| M5 | Redirect `/workspace` → `/app` (301) |

---

## Verification cadence

After each milestone:

1. Full `npm run type-check`, `lint`, `test`, `build`
2. Manual journey test checklist
3. Update `docs/implementation/STATUS.md`
4. Security implications section
