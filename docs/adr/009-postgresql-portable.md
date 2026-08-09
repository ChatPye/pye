# ADR-009: PostgreSQL as Portable System of Record

**Status:** Accepted  
**Date:** 2026-08-09  
**Supersedes:** Partial conflict in DEPLOYMENT_ARCHITECTURE (CockroachDB)

## Decision

**PostgreSQL** (RDS in AWS, portable to Aurora, Cloud SQL, Azure Database) is the sole system of record for:

- Versioned competency assertions
- Evidence + reviewer status
- Consent and audit events
- Learning plans, assignments, sources
- AI jobs and share permissions

Organisation scoping on every tenant row. Soft-delete + retention hooks.

## Consequences

- Complete MongoDB migration
- Schema in `@chatpye/database` + legacy `src/lib/db/schema.ts` during transition
- Exportable JSON bundle type in `@chatpye/domain`
