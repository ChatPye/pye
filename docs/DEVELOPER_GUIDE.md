# ChatPye Developer Guide

## What we are building

ChatPye SkillProof Studio turns an organisation's tutorials, recordings and documents into guided work. Learners ask context-aware questions, follow task steps and submit evidence. Managers assign pathways, review evidence and make the final competency or hiring decision.

**Core promise:** Learn → build → show evidence → review → grow.

## Repository map

| Area | Location | Responsibility |
| --- | --- | --- |
| Homepage and import | `src/components/Hero.tsx`, `src/app/workspace/page.tsx` | YouTube-first entry and session hand-off after sign-in |
| Video workspace | `src/app/workspace/[videoId]/page.tsx`, `src/components/workspace/WorkspaceShell.tsx` | Player, Learning Map, chat, actions and SkillProof task card |
| Video processing | `src/app/api/video/process/route.ts`, `src/services/video-processor/` | Queue, transcript, embeddings, summary and chapters |
| Gemini fallback | `src/lib/video/transcript.ts` | Public YouTube video understanding when captions are unavailable |
| Chat | `src/app/api/chat/route.ts` | Timestamp-aware retrieval, code extraction, streaming response and cache |
| Enterprise courses | `src/app/dashboard/courses/page.tsx`, `src/app/api/courses/` | Create, assign and share learning pathways |
| Manager review | `src/app/dashboard/hr/page.tsx`, `src/app/api/hr/dashboard/route.ts` | Team progress and SkillProof evidence review queue |
| Competencies | `src/lib/db/schema.ts`, `src/lib/db/competency-repository.ts` | CaSS-inspired competencies, assertions, evidence and profiles |
| Product docs | `docs/product/` | UX rules, user guide and MVP scope |

## Video lifecycle

1. A signed-in user pastes a public YouTube URL or uploads a video.
2. `POST /api/video/process` creates/reuses a video record and enqueues work.
3. The staged worker obtains captions; public YouTube videos fall back to Gemini video understanding; uploaded videos use AWS Transcribe.
4. Once a timestamped transcript exists, chat is usable immediately. Embeddings, summary and chapters may continue in the background.
5. The workspace polls status and changes from preparation to the Learning Map and AI tutor.

### Performance rule

Never make chat wait for embeddings. Retrieval tries vector search first, then timestamped keyword search. Cache identical questions per video in Redis when configured, or in short-lived memory for local development.

## Enterprise roles

`employee` learns and submits evidence. `manager`, `trainer`, `hr` and `admin` can create and assign courses. Roles come from Clerk claims and are enforced in `src/lib/hr-auth.ts`.

Course sharing uses a 14-day signed link. Recipients can view the course and explicitly accept or decline. Set `COURSE_INVITE_SECRET` in production; never use the development fallback in a deployed environment.

## Agent architecture

The web MVP is a bounded, transparent agent system:

- **Video intelligence:** Gemini understands public YouTube video audio/visual steps; AWS handles uploaded-video transcription.
- **Tutor:** Bedrock answers against selected timestamped context, with code blocks rendered in the chat UI.
- **Task guide:** SkillProof turns a tutorial into a VS Code or Excel checklist, hints and evidence prompts.
- **Evidence recorder:** task steps, reflections, snips and timestamp clips are recorded as learning events.
- **Manager reviewer:** sees signals and makes the verification decision.

Do not add hidden screen monitoring. A future Windows companion may inspect an app or propose a computer-use action only after the learner selects the app, sees the intended action and gives explicit approval.

## Local development

```powershell
npm install
npm run dev
npm run type-check
npm run build
```

Required local values are listed in `env.example`. Never commit `.env.local`, AWS keys, Gemini keys, Clerk secrets or database URLs.

## Data and cloud choices

- **Vercel:** Next.js web app, server routes and edge-facing delivery.
- **AWS:** S3 uploads, Transcribe for uploaded video, Bedrock fallback/tutoring, Redis-compatible cache where provisioned.
- **CockroachDB:** recommended future system of record for organisations, course assignments, share-link acceptance, evidence, competency assertions and reviewer decisions. The existing Drizzle PostgreSQL schema is portable; migrate only through a staging Cockroach cluster and tested migration.

## Quality checklist before release

1. `npm run type-check`
2. `npm run build`
3. Test public YouTube import, processing status, timestamps and a chat question.
4. Test learner link: create → copy → open logged-out → sign in → accept → confirm it appears in My Courses.
5. Test manager review queue with a reflection and evidence link.
6. Record meaningful commits and update `docs/hackathon/OPENAI_BUILD_WEEK_EVIDENCE.md` for Build Week.
