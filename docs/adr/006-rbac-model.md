# ADR-006: Authorisation — Clerk membership + application RBAC

**Status:** Accepted  
**Date:** 2026-08-04

## Decision

- **Clerk:** Authentication, organisation membership, invitations, session management
- **Application DB:** Roles, permissions, tenant context, audit
- Never store authoritative permissions in Clerk `public_metadata` for org users
- Clerk webhooks sync users/orgs/memberships into Aurora (idempotent)

Admin platform roles (super_admin) may remain Clerk-metadata gated but must move to DB before production.

## Consequences

- Tables: `organisation_memberships`, `application_roles`, `permissions`, `role_permissions`
- Server-side `authorize(action, context)` on every mutation
- Remove hardcoded admin email lists from production code paths
