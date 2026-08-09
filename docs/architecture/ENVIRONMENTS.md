# Environment & Promotion Model

| Environment | Purpose | Cloud resources | Clerk | Stripe | Data |
|-------------|---------|-----------------|-------|--------|------|
| **local** | Developer machine | None required (optional Docker Postgres) | Dev app | Test mode | Synthetic / local DB |
| **preview** | PR validation | None (CI build only) | Dev app | Test mode | **Synthetic only — no prod copies** |
| **staging** | Pre-production integration | **Separate** AWS stack `eu-west-2` | Staging app | Test mode | Staging DB/buckets/queues |
| **production** | Customer traffic | **Separate** AWS stack + public ALB/WAF | Production app | Live mode | Production DB/buckets/queues |

## Isolation requirements

Staging and production MUST NOT share:

- PostgreSQL instances
- S3 buckets
- SQS queues
- Secrets Manager secrets
- Clerk applications / webhook secrets
- Stripe accounts or webhook endpoints
- Terraform state buckets

## Promotion flow

```text
feature branch → PR → preview CI (lint, test, build, terraform validate)
       ↓ merge
     main → staging auto-deploy (CodePipeline) + smoke tests
       ↓ manual approval
     production deploy + health checks + rollback plan
```

## Feature flags

- `FEATURE_GEMINI_YOUTUBE` — YouTube multimodal path
- Environment-specific values in Secrets Manager, not Git

## Scale-to-zero (staging)

ECS desired count may be `0` outside business hours (see staging Terraform `scale_to_zero`).  
Production maintains minimum healthy tasks at all times.

## Configuration source

| Variable | local | staging/prod |
|----------|-------|--------------|
| `CHATPYE_ENV` | local | staging / production |
| `DATABASE_URL` | `.env.local` | Secrets Manager |
| `GEMINI_API_KEY` | `.env.local` | Secrets Manager |
| AWS credentials | Optional dev role | **ECS task role only** |
