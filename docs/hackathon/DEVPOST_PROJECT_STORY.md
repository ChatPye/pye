# SkillProof Studio by ChatPye

## Inspiration

Video is now the default way people learn technical skills, yet most tutorials remain passive. Learners get stuck, leave to search forums, and often finish with a completion badge rather than proof that they can do the work. At the same time, AI can generate convincing code, spreadsheets and CVs, making it harder for managers to distinguish polished output from genuine understanding. We built SkillProof Studio to make the learning process itself visible, supportive and useful as evidence of competence.

## What it does

SkillProof Studio turns a YouTube or training video into an interactive learning workspace. Gemini analyses the tutorial to produce grounded chat, chapters, task steps, quizzes and flashcards. Learners complete a practical task, save links and reflections as evidence, and can submit a public GitHub repository for a tutorial-specific competency assessment. Managers can create Pods, share a learning link and review evidence instead of relying on a course-completion metric.

## How we built it

We built the web application with Next.js, React, TypeScript and Tailwind CSS. The video workflow uses YouTube metadata and Gemini video/text understanding; our contextual tutor uses the Gemini Interactions API. We use Clerk for authentication, Drizzle with PostgreSQL-compatible persistence, and a Vercel deployment path. ChatPye's existing learning architecture supplied the starting point; during OpenAI Build Week we used Codex with GPT-5.6 to repair the processing and chat flow, add the SkillProof task/evidence loop, Gemini study tools and manager-facing collaboration paths.

## Challenges we ran into

The hardest challenge was making an AI experience feel reliable rather than magical-but-fragile. Video processing needs to handle missing captions, model failures and delayed jobs; chat, quizzes and flashcards must still have a useful transcript-grounded fallback. We also had to avoid treating AI assistance as proof of competence. Our approach records clear artefacts, reflections and repository evidence, and labels assessment confidence rather than making unsupported claims.

## Accomplishments that we're proud of

- Restored a working YouTube-to-chat journey for the demo.
- Made task plans dynamic: Excel, VS Code or general work is inferred from the actual tutorial.
- Added formative quizzes, flashcards and evidence capture that feed a competency record.
- Added a GitHub assessment flow that compares a public project to the requirements extracted from its tutorial.
- Kept the learner in control: AI gives guidance and evidence remains inspectable by a manager.

## What we learned

Learning technology should not measure attendance when it can support practice. We learned that the most valuable signal is a transparent chain from tutorial requirement to learner decision, artefact and feedback. We also learned to design AI fallbacks deliberately: a useful transcript-based experience is better than an unavailable feature when a model or provider is constrained.

## What's next for SkillProof Studio by ChatPye

We will complete durable organisation storage and richer manager review, add explicit assignment and consent workflows, and introduce an opt-in Windows companion for VS Code and Excel. The companion will assist only when a learner approves an action; it will never silently monitor or change their workspace. Our aim is to help enterprises turn their existing learning material into faster onboarding, fairer junior hiring and trustworthy proof of skill.
