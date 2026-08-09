import { safeParseResourceAnalysis } from '@/lib/ai/schemas/resource-analysis';

describe('resourceAnalysisSchema', () => {
  it('accepts a minimal valid payload', () => {
    const result = safeParseResourceAnalysis({
      title: 'Balance sheet basics',
      summary: 'Introduces assets and liabilities.',
      learningObjectives: ['Explain assets vs liabilities'],
      chapters: [{ title: 'Intro', startSeconds: 0, summary: 'Overview' }],
      keyConcepts: ['Assets'],
      practicalSteps: ['Open a sample workbook'],
    });

    expect(result.success).toBe(true);
  });

  it('rejects malformed quiz options', () => {
    const result = safeParseResourceAnalysis({
      title: 'Test',
      summary: 'Summary',
      learningObjectives: ['Learn'],
      chapters: [{ title: 'Intro', startSeconds: 0 }],
      keyConcepts: ['Concept'],
      practicalSteps: ['Step'],
      quiz: [
        {
          question: 'Q1',
          options: [{ letter: 'A', text: 'Only one' }],
          correct: 'A',
        },
      ],
    });

    expect(result.success).toBe(false);
  });
});
