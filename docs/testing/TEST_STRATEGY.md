# Test Strategy — ChatPye Workspace

## Layers

| Layer | Tool | Scope |
|-------|------|-------|
| Unit | Jest | Schemas, state machines, RBAC, entitlements |
| Integration | Jest + test DB | Webhooks, tenant isolation, processing jobs |
| E2E | Playwright | Journeys A–D (Milestone 5) |
| Security | Custom matrix | IDOR, SSRF, injection fixtures |

## CI requirements (target)

Every PR: `npm ci`, lint, type-check, unit tests, build, secret scan (M5).

## Current baseline

- Jest configured with `next/jest`
- New tests: resource state machine, analysis schema
- Legacy `token-usage.test.ts` — fix or replace in M1

## Milestone test deliverables

| Milestone | Tests |
|-----------|-------|
| M1 | Gemini schema, import API, ownership checks |
| M2 | Upload validation, entitlement gates |
| M3 | RBAC matrix, org isolation |
| M4 | Evidence transitions, audit events |
| M5 | Stripe webhooks, E2E suite |

## Security test matrix (M5)

- Cross-tenant access attempts
- Share token enumeration
- Webhook replay
- Prompt injection fixtures
- Malicious file uploads
