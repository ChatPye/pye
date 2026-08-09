# Local Developer Setup

## Prerequisites

- Node 20.x
- npm 9+
- Optional: Docker (PostgreSQL + Redis)
- Optional: OpenTofu/Terraform (infra validation only)

## Quick start

```powershell
cd chatpye-web
npm install
Copy-Item env.example .env.local
# Fill: CLERK keys, DATABASE_URL (optional), GEMINI_API_KEY (YouTube features)
npm run dev
```

Open http://localhost:3000

## Monorepo commands

```powershell
npm run type-check      # Root + workspaces
npm run test:unit       # Root + packages tests
npm run infra:validate:staging
```

## Environment variables

| Variable | Purpose |
|----------|---------|
| `CHATPYE_ENV=local` | Environment name |
| `AWS_REGION=eu-west-2` | Default region (even locally for SDK tests) |
| `DATABASE_URL` | PostgreSQL — optional (in-memory fallbacks exist during migration) |
| `GEMINI_API_KEY` | YouTube AI |
| `FEATURE_GEMINI_YOUTUBE=true` | Enable YouTube multimodal |

## Package development

```powershell
cd packages/ai-core
npm test
```

## Docker PostgreSQL (optional)

```powershell
docker run -d --name chatpye-pg -e POSTGRES_PASSWORD=local -e POSTGRES_DB=chatpye -p 5432:5432 postgres:16
# DATABASE_URL=postgresql://postgres:local@localhost:5432/chatpye
npm run db:push
```

## What not to do locally

- Do not commit `.env.local`
- Do not run `tofu apply` without operator approval
- Do not point local env at production secrets

See `CONTRIBUTING.md`.
