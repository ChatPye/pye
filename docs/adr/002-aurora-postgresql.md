# ADR-002: Primary Database — Amazon Aurora PostgreSQL

**Status:** Accepted  
**Date:** 2026-08-04

## Context

Docs disagree: `ARCHITECTURE.md` recommends Aurora; `DEPLOYMENT_ARCHITECTURE.md` mentions CockroachDB. Schema uses Drizzle + PostgreSQL dialect.

## Decision

**Aurora PostgreSQL Serverless v2** is the system of record. CockroachDB plan is **rejected** for launch.

## Rationale

- Existing Drizzle schema and repositories
- pgvector available for upload RAG if needed
- AWS credit alignment and operational familiarity
- ACID for billing, evidence, audit

## Consequences

- Update deployment docs to remove CockroachDB references
- Complete MongoDB → Aurora migration
- Add RDS Proxy if connection pooling required on ECS
