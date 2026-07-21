# ChatPye SkillProof Studio — Product Design System

## Purpose

ChatPye turns an organisation's existing learning material into guided work, competency evidence and confident talent decisions. The interface should therefore make the next useful action obvious, show evidence transparently, and never imply hidden surveillance or a capability that is not available.

## Product surfaces

| Surface | Primary job | Primary user |
| --- | --- | --- |
| Marketing and import | Turn curiosity into a first video workspace | Learner, manager, trainer |
| SkillProof Studio | Learn, build, save evidence and submit work | Learner |
| Manager dashboard | Assign a pathway, see evidence and review candidates | Manager, L&D lead |
| Challenge page | Explain the work, learning resources and rubric | Participant, hiring team |

## Visual language

- **Foundation:** near-black zinc backgrounds, white type and generous rounded panels.
- **Action colour:** emerald means meaningful progress, evidence and completion.
- **Supporting colours:** blue for learning tools, amber for hints and decisions, violet for sharing and community, rose only for errors or destructive actions.
- **Type:** compact uppercase labels for context; sentence-case headings that state the learner or manager outcome.
- **Spacing:** 8px rhythm; 12–16px internal panel spacing; 24px between content groups.
- **Depth:** use a single subtle border and quiet surface tint before adding shadow or colour.

## Interaction rules

1. Every primary action gets an immediate visible state: processing, saved, needs attention, or failed.
2. A learner can always see: **what to do now**, **why it matters**, and **what counts as evidence**.
3. AI starts with explanation and graduated hints. It does not silently operate VS Code, Excel, or another application.
4. Any future computer-use action must be explicit, previewed, reversible where possible, and attributed in the evidence trail.
5. Labels must be literal. A "timestamp clip" is not a rendered video clip; a "confidence" score is not a hiring decision.

## Core components

### Learning map

Generated chapters are shown as a numbered task path. The active chapter remains visible above the horizontally-scrollable list, with a timestamp and a one-line outcome. Selecting a chapter seeks the player.

### SkillProof task card

Each assignment contains: work context (VS Code or Excel), numbered checklist, a graduated hint, and evidence/reflection capture. Completion records are evidence signals, not automatically verified assertions.

### Competency assertion

Every competency card must show:

- competency and level;
- what was demonstrated;
- linked evidence (submission, reflection, project or assessment);
- confidence; and
- reviewer status: `system evidence`, `manager reviewed`, or `verified`.

This follows CaSS-style separation between a competency definition, its assertion and its evidence without requiring a learner to understand the underlying data model.

## Accessibility and quality bar

- Keyboard-focusable controls, descriptive labels and sensible `aria-current` states.
- Never use colour alone to convey task status.
- Keep text contrast high against dark surfaces.
- Design desktop-first for the Studio, but make all learner cards and task submission usable on mobile.

## Demo path: balance-sheet build-along

1. Manager imports a public balance-sheet tutorial and chooses **Create SkillProof challenge**.
2. AI proposes chapters, Excel steps, quiz prompts and evidence requirements; the manager edits before assigning.
3. Learner opens the Studio: video on the left, Excel task checklist and tutor on the right.
4. Learner pauses at a chapter, asks for a hint, works in Excel, uploads a workbook link and writes a short rationale.
5. Manager reviews the workbook, rationale, task progression and any quiz results; they confirm or request changes.

## Current product boundary

The web MVP supports guided video learning, task checklists, evidence links and reflections. Native VS Code/Excel observation and opt-in computer-use assistance are a later Windows companion capability, not hidden monitoring in the web product.
