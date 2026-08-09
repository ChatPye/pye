# ADR-005: Route Migration — `/app` and `/org` with redirects

**Status:** Accepted  
**Date:** 2026-08-04

## Decision

Introduce target routes incrementally:

1. Add `/app/*` routes that re-export or redirect to current `/workspace/*` implementations
2. Add `/org/[orgSlug]/*` parallel to `/dashboard/*`
3. Maintain 301 redirects from legacy paths for one release cycle
4. Update middleware matchers and navigation gradually

## Rationale

Avoid big-bang rewrite of 58 routes and deep links while meeting product URL spec.

## Consequences

- `next.config.ts` redirects table
- Unified routing helper in `src/lib/routing.ts`
