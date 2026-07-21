# SkillProof Studio MVP

## Enterprise proposition

**SkillProof Studio turns an organisation's existing tutorials into guided work, verified competency evidence, and a shortlist of talent ready for the next task.**

Enterprises pay because the product reduces three costly gaps: junior staff get blocked while learning, managers cannot tell whether completed work reflects understanding, and hiring teams spend time screening weak signals such as CVs and course-completion certificates.

The commercial loop is:

`company material -> AI-guided practice -> submitted evidence -> competency assertions -> upskill, certify, or hire`

## First work contexts

### VS Code: junior developer build-along

An organisation supplies a coding tutorial, repository and project brief. SkillProof Studio identifies the build steps, guides a learner with graduated hints, quizzes key decisions, collects a GitHub/repository submission and stores timestamped evidence of the completed task.

### Excel: analyst or operations associate build-along

An organisation supplies an Excel tutorial, source workbook/template and a business scenario. SkillProof Studio identifies the required formulas, transformations and checks; the learner submits the workbook and explains key decisions. The employer sees the work product and the evidence behind the skill assertion.

## Competency model

The MVP adopts CaSS concepts without making the CaSS server a runtime dependency:

| CaSS concept | SkillProof Studio record |
| --- | --- |
| Competency | A defined, organisation-owned capability, e.g. “Build a REST API endpoint” or “Create a validated Excel model”. |
| Framework | A named set of competencies for a challenge, role or learning pathway. |
| Assertion | A time-bound claim that a learner demonstrated a competency at a stated level. |
| Evidence | Submission, quiz response, task completion, reflection, source timestamp or reviewer decision supporting an assertion. |
| Relationship | Prerequisite, broader/narrower, or equivalent competency relationship. |

Assertions are never based on video watching alone. They require evidence and expose the assessment source, confidence and reviewer/AI status. Learners can view their evidence, and employers can configure visibility and retention.

## MVP boundary

The web product guides and assesses work. It does not secretly monitor a person’s desktop or autonomously make consequential changes. A future Windows companion may offer opt-in, visible assistance for VS Code and Excel; every action will require learner confirmation.

## Success measures

- Percentage of learners able to ask a contextual question after a video is processed.
- Percentage completing a guided VS Code or Excel challenge.
- Number of evidence-backed competency assertions accepted by an employer or reviewer.
- Time saved by a manager in identifying candidates to interview or support.
