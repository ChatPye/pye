# Lint baseline

**Recorded:** 2026-08-09  
**Cap:** `326` warnings (`npm run lint -- --max-warnings 326`)

## Policy

- **Zero new errors** — CI and local `npm run lint` must pass.
- **Do not increase the warning cap** without a documented cleanup PR.
- Ratchet the cap **down** when touching legacy files (remove warnings, then lower the cap in `package.json`).

## Known inherited issues

Most warnings are pre-existing in legacy workspace/dashboard components. Recent fixes in the AWS platform handover:

- Renamed non-hook helpers (`useAuroraForVideos` → `isAuroraConfiguredForVideos`).
- Fixed conditional `useUser()` on the admin page.
- Replaced internal `<a href="/…">` nav links with `next/link` in `Header.tsx`.

## Edge build note

`src/lib/api/errors.ts` imports Node `crypto`. Next.js build may warn if this
module is pulled into Edge routes — split Edge-safe helpers before enabling on
middleware/edge handlers.
