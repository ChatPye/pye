# Threat Model — ChatPye Workspace (Initial)

**Status:** Draft for Milestone 0 · **Review before production**

## Assets

- Employee learning data, evidence, reflections
- Competency assertions and review decisions
- Organisation plans and audit history
- API keys (Gemini, Bedrock, Clerk, Stripe)
- Uploaded PDFs/videos

## Threat actors

- Anonymous internet user
- Authenticated employee (other tenant)
- Malicious manager (overreach)
- Compromised API key
- Untrusted imported content (prompt injection)

## STRIDE summary

| Threat | Example | Mitigation (target) |
|--------|---------|---------------------|
| Spoofing | Fake Clerk session | Clerk JWT verification; webhook sync |
| Tampering | Modify evidence status client-side | Server-only state transitions |
| Repudiation | Deny review decision | `audit_events` immutable log |
| Info disclosure | IDOR on `/api/video/[id]` | Ownership + org membership checks |
| DoS | AI cost attack | Rate limits, quotas, circuit breakers |
| Elevation | Set admin_role in public_metadata | App DB permissions; block client metadata trust |

## Priority controls (Milestone 1–5)

1. Tenant isolation on all queries
2. Clerk + Stripe webhook signature verification
3. SSRF protection for URL imports (M2)
4. Upload validation (MIME, magic bytes, size) (M2)
5. CSP hardening (remove unsafe-eval where possible)
6. Secret scanning in CI
7. `DEV_AUTH_BYPASS` blocked when `NODE_ENV=production`
8. Share tokens: 128-bit+ entropy, expiry, revocation
9. Prompt injection fixtures in tests
10. Backup/restore drill (M5)

## Out of scope threats

- Desktop keystroke monitoring (product explicitly excluded)
- Autonomous computer control

## Legal / privacy

See `docs/security/PRIVACY_MODEL.md`. Formal DPIA required before UK enterprise launch.
