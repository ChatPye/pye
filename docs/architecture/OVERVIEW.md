# Architecture Overview — Multi-Cloud Portable ChatPye

**Primary cloud (now):** AWS London (`eu-west-2`)  
**Design goal:** Portable product code; cloud-specific code isolated to `packages/ai-providers` and `infra/`

## Repository layout

```
apps/
  web/      Next.js ChatPye Workspace (root migration in progress)
  api/      Stateless API service (ECS)
  worker/   Async AI/resource jobs (ECS)
packages/
  ai-core/       Provider-neutral types, router, circuit breakers
  ai-providers/  Gemini, Bedrock, Azure/Vertex stubs
  domain/        CASS-aligned domain types
  database/      Portable Drizzle schema (PostgreSQL)
  auth/          Tenant authorisation boundary
  observability/ OpenTelemetry + JSON logs + audit helpers
  config/        Environment configuration
  ui/            Shared UI primitives (extracted over time)
infra/
  modules/       OpenTofu modules
  environments/  staging | production (isolated)
```

## Runtime topology (AWS)

```text
GitHub → CodeConnections → CodePipeline → CodeBuild → ECR
                                              ↓
Internet → WAF → ALB (production only) → ECS Fargate (web/api)
                                              ↓
                         worker ← SQS ← API/web mutations
                           ↓
              PostgreSQL · Redis · S3 · Secrets Manager · CloudWatch
```

## Portability rules

1. **No AWS SDK imports** outside `packages/ai-providers` and `infra/`.
2. **PostgreSQL** is the portable system of record (not DynamoDB/Mongo for new features).
3. **Object storage** accessed via adapter interface (S3 implementation first).
4. **Queues** accessed via adapter interface (SQS implementation first).
5. **Secrets** from Secrets Manager at runtime — never Git or `NEXT_PUBLIC_*`.

## Data classification

| Class | Examples | Storage |
|-------|----------|---------|
| Public | Marketing content | CDN |
| Internal | Org settings | PostgreSQL |
| Confidential | Evidence, assertions, AI jobs | PostgreSQL + S3 (KMS) |
| Restricted | Secrets, keys | Secrets Manager |

See also: `docs/architecture/SYSTEM_OVERVIEW.md`, `docs/architecture/ENVIRONMENTS.md`.
