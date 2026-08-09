# ADR-001: Infrastructure as Code — AWS CDK

**Status:** Superseded by [ADR-007](./007-opentofu-terraform.md)  
**Date:** 2026-08-04

## Context

Production target is AWS (ECS Fargate, Aurora, S3, SQS, CloudFront). The repository currently has PowerShell deploy scripts only.

## Decision

Use **AWS CDK (TypeScript)** in `infra/` for all production infrastructure.

## Rationale

- Same language as the Next.js application
- Strong constructs for ECS, Aurora, SQS, WAF
- Type-safe environment composition (dev/staging/prod)
- Team already uses TypeScript; Terraform would add a second toolchain

## Consequences

- Add `infra/` CDK app with staged rollout (Milestone 5)
- Deprecate script-only deployment for production paths
- Document synth/deploy in `docs/operations/DEPLOYMENT.md`
