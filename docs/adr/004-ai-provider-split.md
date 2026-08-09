# ADR-004: AI Provider Split — Gemini (YouTube) + Bedrock (Uploads & Agents)

**Status:** Revised — pending approval via `docs/implementation/MASTER_PLAN.md` Section 3  
**Date:** 2026-08-04 (revised same day)

## Context

ChatPye’s acquisition loop depends on **Gemini’s preview YouTube URL capability** (currently no charge, subject to change). AWS Bedrock credits should fund **paid custom video** and **B2B workforce AI**, not YouTube tutoring.

Initial ADR-004 incorrectly assigned Bedrock as the default Pye chat path for all resources.

## Decision

| Capability | Provider |
|------------|----------|
| Public YouTube — structured analysis (chapters, objectives, quiz, flashcards) | **Gemini** (YouTube URL in Interactions API) |
| Public YouTube — Pye tutor chat (timestamp citations, hints, quiz me) | **Gemini** (same URL + cached artefact context) |
| Custom video upload (paid) — transcribe | **AWS Transcribe** |
| Custom video upload — embeddings + RAG | **Bedrock Titan** |
| Custom video upload — Pye tutor chat | **Bedrock Claude** |
| PDF / web (M2+) | Bedrock primary; Gemini File API evaluated for cost |
| Growth Plan drafting | **Bedrock Claude** |
| Evidence analysis → draft assertion | **Bedrock Claude** |
| Review summaries, workforce agents | **Bedrock Claude** |

## Implementation

- `src/lib/ai/router.ts` routes by `resource.sourceType`
- `gemini-youtube.ts` — all YouTube multimodal AI
- `bedrock-upload.ts` — existing `/api/chat` RAG path
- `bedrock-agents.ts` — plan/evidence/review endpoints
- Shared Zod output schema regardless of provider

## Consequences

- Do **not** wire Bedrock tutor to YouTube workspace chat
- Remove `ytdl-core`; never download YouTube media
- Feature flag `FEATURE_GEMINI_YOUTUBE` + per-user daily quota + platform circuit breaker
- Commercial pricing must not assume YouTube Gemini remains free

## References

- [Gemini video understanding](https://ai.google.dev/gemini-api/docs/video-understanding)
- `docs/implementation/MASTER_PLAN.md` Section 3
