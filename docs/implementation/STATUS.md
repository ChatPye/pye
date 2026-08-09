# Implementation Status

**Last updated:** 2026-08-09  
**Canonical repo:** https://github.com/ChatPye/pye  
**Master plan:** v1.2 — `docs/implementation/MASTER_PLAN.md`  
**Platform handover:** `docs/operations/AWS_PLATFORM_HANDOVER.md`  
**Current gate:** M1.7 complete → proceed to M1.8 (`/app/import` UI)

---

## Milestone 0.5 — Infrastructure & portability ✅

- [x] Monorepo: `apps/{web,api,worker}`, `packages/{ai-core,ai-providers,domain,database,auth,observability,config,ui}`
- [x] `@chatpye/ai-core` router with circuit breakers, retries, tests
- [x] `@chatpye/ai-providers`: Gemini, Bedrock, Azure/Vertex stubs + tests
- [x] OpenTofu modules: VPC, ECR, ECS, ALB, S3, SQS, RDS, ElastiCache, KMS, Secrets, CloudWatch, WAF, CodePipeline
- [x] Environments: `infra/environments/staging`, `infra/environments/production` (eu-west-2)
- [x] Portable schema: `ai_jobs`, `audit_events`, `data_retention_policies`
- [x] Docs: architecture, runbooks, security, ADRs 007–010
- [x] **I0.7** Wire root app → `@chatpye/*` packages (router, schemas, DB re-exports)
- [ ] Operator `tofu apply` — **not executed** (approval required)
- [ ] **I0.8** CodePipeline deploy stage + ECS task defs

---

## Milestone 1 progress

| ID | Task | Status |
|----|------|--------|
| M1.1–M1.5 | Gemini YouTube + chat routing | ✅ Done |
| M1.6 | Drizzle `resources` + `resource_processing_jobs` | ✅ Done |
| M1.7 | Import API → queue → worker → `ready` | ✅ Done |
| M1.8 | `/app/import` dedicated UI | ⬜ Next |

---

## Verification

| Check | Result |
|-------|--------|
| Root type-check | ✅ Pass (`npm run type-check`) |
| Root unit tests | ✅ 32 pass (`npm run test:unit`) |
| DB migration | Run `npm run db:generate` then `npm run db:migrate` when `DATABASE_URL` is set |
| Terraform validate | `npm run infra:validate:staging` (requires OpenTofu/Terraform CLI) |
| Cloud apply | **Blocked** — operator approval required per `infra/README.md` |

---

## Key docs

| Doc | Path |
|-----|------|
| Architecture overview | `docs/architecture/OVERVIEW.md` |
| Environments | `docs/architecture/ENVIRONMENTS.md` |
| AI routing | `docs/architecture/AI_PROVIDER_ROUTING.md` |
| Deployment | `docs/runbooks/DEPLOYMENT.md` |
| Local setup | `docs/LOCAL_DEVELOPMENT.md` |
