import { z } from 'zod';

export const resourceAnalysisSchema = z.object({
  title: z.string().min(1).max(500),
  description: z.string().max(5000).optional().default(''),
  summary: z.string().min(1).max(8000),
  learningObjectives: z.array(z.string().min(1).max(400)).min(1).max(12),
  chapters: z
    .array(
      z.object({
        title: z.string().min(1).max(500),
        startSeconds: z.number().nonnegative(),
        summary: z.string().max(2000).optional(),
      }),
    )
    .min(1)
    .max(40),
  keyConcepts: z.array(z.string().min(1).max(200)).max(30),
  practicalSteps: z.array(z.string().min(1).max(400)).max(20),
  toolCues: z
    .array(z.enum(['excel', 'vscode', 'browser', 'figma', 'general']))
    .max(10)
    .default([]),
  quiz: z
    .array(
      z.object({
        question: z.string().min(1).max(500),
        options: z
          .array(
            z.object({
              letter: z.string().regex(/^[A-D]$/),
              text: z.string().min(1).max(300),
            }),
          )
          .length(4),
        correct: z.string().regex(/^[A-D]$/),
        explanation: z.string().max(1000).optional(),
      }),
    )
    .max(20)
    .default([]),
  flashcards: z
    .array(z.object({ front: z.string().min(1).max(300), back: z.string().min(1).max(800) }))
    .max(40)
    .default([]),
  suggestedEvidence: z.array(z.string().max(400)).max(10).default([]),
  competencyCandidates: z
    .array(
      z.object({
        name: z.string().min(1).max(200),
        level: z.enum(['foundational', 'intermediate', 'proficient', 'advanced']),
        rationale: z.string().max(500),
      }),
    )
    .max(10)
    .default([]),
  sourceReferences: z
    .array(
      z.object({
        type: z.enum(['timestamp', 'page', 'section', 'url']),
        label: z.string().max(200),
        ref: z.string().max(500),
      }),
    )
    .default([]),
  safetyNotes: z.array(z.string().max(500)).max(5).default([]),
});

export type ResourceAnalysis = z.infer<typeof resourceAnalysisSchema>;

export function parseResourceAnalysis(input: unknown): ResourceAnalysis {
  return resourceAnalysisSchema.parse(input);
}

export function safeParseResourceAnalysis(input: unknown) {
  return resourceAnalysisSchema.safeParse(input);
}
