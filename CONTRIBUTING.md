# Contributing — ChatPye Workspace

## Setup

```powershell
npm install
Copy-Item env.example .env.local
npm run dev
```

Node 20.x recommended (see `package.json` engines).

## Checks before PR

```powershell
npm run type-check
npm run lint
npm run test:unit
npm run build
```

## Conventions

- Server-side authorisation for every protected mutation
- No mock data in production code paths
- Match Midnight Studio tokens (`docs/design/DESIGN_SYSTEM.md`)
- Small vertical slices; keep app working after each merge

## Docs

Update `docs/implementation/STATUS.md` when completing milestone work.
