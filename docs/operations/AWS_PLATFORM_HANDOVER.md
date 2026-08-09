# AWS platform baseline — Cursor handover

**Canonical repository:** https://github.com/ChatPye/pye  
**Target AWS region:** `eu-west-2` (London)  
**Next.js app root:** repository root (`apps/web` is Docker/monorepo placeholder only)

---

## Changes in this handover

### Application and CI

- Fixed server-side predicate names incorrectly prefixed with `use` (e.g. `isAuroraConfiguredForVideos`).
- Fixed conditional `useUser` on the admin page.
- Replaced internal anchors with `next/link` in the header.
- Root `dev`, `build`, and `start` run the actual Next.js app at repo root.
- Webpack `extensionAlias` maps NodeNext `.js` specifiers to TypeScript sources.
- Web Docker build sets `DEPLOY_TARGET=ecs` for standalone output.
- Lint cap recorded at **326 warnings** — see `docs/operations/LINT_BASELINE.md`.

### AWS infrastructure safety and cost controls

- VPC route-table associations for public/private subnets.
- Configurable NAT gateway count: staging **1**, production **2**.
- PostgreSQL ingress restricted to ECS service security group (not `10.0.0.0/8`).
- Staging RDS: `db.t4g.micro`; Redis **disabled** in staging stack.
- RDS retains final snapshots; production deletion protection enabled.
- CodePipeline source: `ChatPye/pye`.
- CodeBuild default: `BUILD_GENERAL1_SMALL` (raise to Medium only if Docker OOMs).

---

## Validation (local)

```powershell
npm run type-check
npm run test:unit
npm run lint
$env:SKIP_ENV_VALIDATION='true'
$env:NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY='pk_test_ci_placeholder'
$env:CLERK_SECRET_KEY='sk_test_ci_placeholder'
npm run build
```

---

## Do not run `tofu apply` yet

ECS delivery path still incomplete:

1. Least-privilege IAM for CodePipeline/CodeBuild.
2. ECR login/push + immutable tags in `infra/buildspec.yml`.
3. ECS task definitions/services (web, api, worker) + task/execution roles.
4. ALB target groups, HTTPS/ACM, health checks, CodePipeline deploy stage + rollback.
5. Bootstrap state bucket + DynamoDB lock (`infra/bootstrap/README.md`).
6. Secrets in AWS Secrets Manager only (Clerk, Stripe, Gemini, DB, AI fallbacks).
7. CodeConnections GitHub ARN via `codestar_connection_arn` + AWS UI approval.

---

## Recommended deployment sequence

1. Bootstrap state + KMS + budgets in `eu-west-2`.
2. IAM Identity Center for people; CodeConnections/CodePipeline/CodeBuild roles for delivery (no permanent access keys).
3. Validate staging Terraform (`init -backend=false`, `validate`, reviewed `plan`).
4. Apply staging with ECS desired count **0**; push images; scale web to **1** after secrets + ALB health checks.
5. Smoke-test: Clerk sign-in, YouTube import, Gemini processing/chat, competency/evidence persistence, observability.
6. Review costs; promote same module config to production with manual approval.

---

## Product guardrails

- **Gemini** primary for public YouTube; internal provider router for Bedrock/Azure/Vertex fallback.
- **Custom uploads** — paid storage/processing + signed URLs only.
- **Manager-visible records** — explicit learner notice, scoped consent, evidence provenance, audit log. Private self-directed learning stays private by default.

---

See also: `docs/runbooks/DEPLOYMENT.md`, `docs/architecture/ENVIRONMENTS.md`, `infra/README.md`.
