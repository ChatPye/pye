# AI Provider Routing & Fallback Policy

**Package:** `@chatpye/ai-core` + `@chatpye/ai-providers`

## Routing matrix

| Capability | YouTube | Custom upload | Agents |
|------------|---------|---------------|--------|
| Structured analysis | **Gemini** | Bedrock | — |
| Pye tutor chat | **Gemini** | **Bedrock** | — |
| Growth plan draft | — | — | **Bedrock** |
| Evidence analysis | — | — | **Bedrock** |
| Review summary | — | — | **Bedrock** |

Future: **Vertex** may mirror Gemini for YouTube; **Azure Foundry** for agents — stubs exist with tests.

## Router inputs

The router (`packages/ai-core/src/router.ts`) considers:

1. Capability + source type
2. Organisation AI policy (allowed providers)
3. Provider health / circuit breaker
4. Environment (preview may disable paid providers)
5. Estimated cost (org daily cap — wired in M1.6+)

## Fallback order

| Context | Order |
|---------|-------|
| YouTube video | gemini → bedrock |
| Upload video | bedrock → gemini |
| Workforce agents | bedrock → azure_foundry → vertex |

## Circuit breaker

- Opens after **5 consecutive failures** per provider
- Half-open retry after **60 seconds**
- User sees: *"Pye is temporarily unavailable…"* (`USER_SAFE_FALLBACK`)

## Retries

- Max **3 attempts** with exponential backoff + jitter
- Idempotent job IDs for async processing

## Persistence (`ai_jobs` table)

Every job records:

- `provider`, `model`, `prompt_version`
- Token usage + latency + estimated cost
- `source_references[]`
- Status + attempt count

## Async jobs

Structured analysis, evidence assessment and competency drafting run on **SQS → worker** — never blocking HTTP beyond acceptance.

See `docs/adr/004-ai-provider-split.md` and `docs/adr/008-ai-provider-abstraction.md`.
