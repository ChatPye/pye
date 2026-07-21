# SkillProof Studio Roadmap

## Release 1 — Web pilot: test before desktop

### Complete in the current web release

- Public YouTube import and private video upload.
- Gemini timestamped video understanding, with AWS processing for uploads.
- Timestamp-aware tutor with code rendering and cached retrieval.
- Learning Map, snips, timestamp clips, guided VS Code and Excel tasks.
- Manager course creation, direct assignment, signed learner links, accept/decline and review queue.
- Transparent competency evidence and human reviewer status.

### Pilot tests to run

1. **Balance-sheet build-along:** manager imports an Excel tutorial; learner creates a model, submits a workbook link and explains why Assets equal Liabilities plus Equity.
2. **VS Code build-along:** manager imports a small API tutorial; learner follows the task steps, adds a GitHub repository and explains one debugging decision.
3. **Invitation:** manager copies a learner link; an invited user signs in, accepts it and sees the pathway under My Courses.
4. **Processing resilience:** test a captioned YouTube tutorial, a tutorial without captions, an uploaded MP4 and a temporary Gemini failure.
5. **Manager review:** confirm that task steps, snips, clips, evidence links and reflections appear as system evidence—not automatic verification.

## Release 2 — Enterprise challenge builder

- Convert a manager video/PDF into an editable SkillProof challenge.
- Generate task steps, rubric, quiz prompts and evidence requirements.
- Add challenge deadlines, private/public enrolment and a reviewed leaderboard.
- Support competency frameworks, assertions and expiry/prerequisite relationships using the CaSS-inspired data model.
- Add CockroachDB staging migration for durable multi-tenant business data.

## Release 3 — Windows companion (only after pilot evidence)

- Visible, opt-in companion for VS Code and Excel.
- User selects the active application and sees what context is shared.
- Tutor can propose an action; the user previews and approves before it changes anything.
- Completion signals are attributable and reviewable; no background monitoring.
- Start with Excel balance sheet and VS Code project adapters, then evaluate Google Sheets/browser workflows.

## Non-negotiable product rules

- Do not call a signal “verified” until a manager or approved assessment policy verifies it.
- Do not use computer control without visible consent and an audit trail.
- Keep chat usable after transcript creation; never block on embeddings.
- Keep external model use replaceable: Gemini for public YouTube understanding, Bedrock as AWS fallback, and isolated provider adapters.
