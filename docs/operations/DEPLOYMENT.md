# Deployment — ChatPye Workspace

## Environments

| Environment | Host (target) | Branch |
|-------------|---------------|--------|
| Development | Local `npm run dev` | feature branches |
| Preview | Vercel PR previews | pull requests |
| Staging | AWS ECS (M5) | `main` |
| Production | AWS ECS (M5) | release tag + manual approval |

## Current (baseline)

Vercel connected to GitHub; `deploy-vercel.yml` on main. Aurora via `npm run db:push`.

## Target (Milestone 5)

1. Build Docker image → ECR
2. CDK deploy staging stack
3. Run Drizzle migrations
4. Smoke test `/api/system/health`
5. Manual approval → production

See `docs/architecture/AWS_ARCHITECTURE.md` and `infra/README.md`.

## Rollback

- ECS: revert task definition to previous image digest
- Database: restore Aurora snapshot (runbook in `RUNBOOK.md`)

## Required secrets

Documented in `env.example` and `docs/secrets/github-secrets.md`.
