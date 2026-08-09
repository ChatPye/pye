# ADR-010: AWS-First with Multi-Cloud Expansion Path

**Status:** Accepted  
**Date:** 2026-08-09

## Decision

- **Now:** AWS London (`eu-west-2`) — ECS Fargate, RDS PostgreSQL, S3, SQS, ElastiCache, CodePipeline
- **Product code:** Cloud-neutral packages; no AWS SDK outside adapters
- **Future:** Azure Foundry + Vertex stubs implement same `AiProvider` interface

## Non-goals (launch)

- Active-active multi-region
- Running production on two clouds simultaneously

## Expansion triggers

- Enterprise contract requires Azure/GCP residency
- Gemini/Vertex parity for YouTube in specific regions

## Consequences

- Stubs tested without live credentials
- Terraform modules remain AWS-specific; Azure/GCP infra added as separate root modules later
