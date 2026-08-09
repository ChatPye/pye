# @chatpye/web

The Next.js ChatPye Workspace application.

## Migration note

During Phase 1 of the monorepo migration, the live Next.js app remains at the **repository root** (`src/`, `next.config.ts`, `public/`). This workspace package owns the npm scripts invoked from the root `package.json`.

Phase 2 will physically move `src/` → `apps/web/src/` without changing runtime behaviour.

## Local development

From repository root:

```bash
npm install
cp env.example .env.local
npm run dev
```
