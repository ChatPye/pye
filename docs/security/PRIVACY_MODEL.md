# Privacy Model — ChatPye Workspace (Initial)

**Alignment target:** UK GDPR principles · **Status:** Engineering draft — legal review required

## Data categories

| Category | Examples | Default retention |
|----------|----------|-------------------|
| Account | Email, name, Clerk ID | Life of account |
| Learning | Resources, notes, chat | User-controlled |
| Evidence | Submissions, files | Plan policy + user withdrawal |
| Organisation | Plans, reviews, audit | Org policy |
| Billing | Stripe customer ID | Legal/tax requirements |

## Visibility (employee-facing)

Every assigned item displays:

- What the manager can see
- What is measured
- Required evidence
- Retention period
- Reviewer identity
- How to challenge an assessment

## Employee rights (product support)

- [ ] Data export (M5)
- [ ] Account deletion (M5)
- [ ] Evidence withdrawal (M4)
- [ ] Share link revocation (M4)
- [ ] Organisation offboarding (M5)

## Prohibited inference

Do **not** infer protected characteristics, mental state, personality, loyalty or productivity scores from learning interactions.

## Analytics

Product analytics (`docs/implementation/STATUS.md`) — events only, no raw work content. Consent-controlled.

## Logging

Do not log by default: full prompts, documents, evidence files, chat content. Use redaction + reference IDs.

## Consent records

Store employee acceptance of Growth Plan visibility terms in `plan_members.consent_at` + policy version (M3).
