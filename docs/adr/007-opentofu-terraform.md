# ADR-007: Infrastructure as Code — OpenTofu/Terraform (supersedes ADR-001)

**Status:** Accepted  
**Date:** 2026-08-09  
**Supersedes:** ADR-001 (AWS CDK)

## Decision

Use **OpenTofu/Terraform** in `infra/` for all AWS infrastructure. Primary region **eu-west-2**.

## Rationale

- Operator-visible, portable IaC across clouds
- Module composition for staging/production isolation
- Aligns with multi-cloud portability goal better than CDK-only AWS coupling

## Consequences

- ADR-001 marked superseded
- `infra/modules/*` + `infra/environments/{staging,production}`
- **No `tofu apply` without operator approval**
