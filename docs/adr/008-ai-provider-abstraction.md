# ADR-008: AI Provider Abstraction Layer

**Status:** Accepted  
**Date:** 2026-08-09

## Decision

- `@chatpye/ai-core` — provider-neutral types, router, circuit breakers, retries
- `@chatpye/ai-providers` — Gemini, Bedrock, Azure Foundry stub, Vertex stub
- AWS SDK imports **only** in Bedrock adapter
- Persist every job in `ai_jobs` with provider/model/promptVersion/usage/sourceReferences

## Routing

See `docs/architecture/AI_PROVIDER_ROUTING.md`.

## Consequences

- Product code imports `@chatpye/ai-core` / router, not Bedrock/Gemini SDKs
- Async processing for analysis and assessment jobs
