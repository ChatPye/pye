# ADR-003: Production Hosting — AWS ECS Fargate

**Status:** Accepted  
**Date:** 2026-08-04

## Context

Current deployment is Vercel (`vercel.json`, `deploy-vercel.yml`). Master prompt requires AWS-native production on ECS behind ALB + CloudFront.

## Decision

- **Production:** Containerised Next.js on **ECS Fargate**
- **Interim:** Vercel previews acceptable for PR validation until Milestone 5
- **Workers:** SQS + Lambda (short jobs) + Fargate workers (long processing)

## Rationale

- Unified AWS billing, VPC isolation, WAF, Secrets Manager
- Long-running video/PDF workers colocated with queue
- Avoid serverless timeout limits for heavy processing

## Consequences

- Dockerfile + ECR pipeline in Milestone 5
- Keep Vercel workflow until AWS cutover
- Environment parity via `.env.example` + SSM Parameter Store
