# Security & Data Handling Policy

## Secrets

- Stored in **AWS Secrets Manager** (staging/production)
- Injected into ECS tasks at runtime via task definitions
- **Never** in Git, client bundles, or plaintext GitHub Actions variables
- CI uses **CodeConnections + workload IAM roles** — no long-lived access keys

## Tenant isolation

- Every org-owned query includes `organisation_id`
- Server resolves tenant from Clerk session — never trust client body alone
- RBAC in `@chatpye/auth` + application DB permissions

## Data at rest

- RDS PostgreSQL encrypted (KMS)
- S3 SSE-KMS with lifecycle policies
- Redis in private subnets

## Data in transit

- TLS 1.2+ everywhere public
- ALB + WAF on production only

## AI data handling

- Do not log full prompts, documents or evidence by default
- Persist AI job metadata in `ai_jobs` without raw content where possible
- Imported content treated as **untrusted** (prompt injection mitigation)

## Audit events

Mandatory audit for:

- AI job start/complete/fail
- Evidence submit/review
- Assertion create/review
- Share create/revoke
- Export request/complete
- Admin actions
- Consent recorded

Stored in `audit_events` with actor, org, resource, timestamp.

## Employee trust

- Visibility badges on all shareable items
- No surveillance analytics or personality inference
- GDPR-oriented export/deletion hooks (see `docs/security/PRIVACY_MODEL.md`)

## Preview environment

**Synthetic data only** — never copy production DB or secrets into preview.
