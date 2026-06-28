import { invokeBedrockText } from '@/lib/bedrock-invoke';

export type QuizQuestion = {
  question: string;
  options: Array<{ letter: string; text: string }>;
  correct: string;
};

/** Generate MCQ quiz from transcript (Talk-to-Videos pattern, Nova on Bedrock). */
export async function generateQuizFromTranscript(
  transcriptText: string,
  numQuestions = 10
): Promise<QuizQuestion[]> {
  const prompt = `Based on the video transcript, generate ${numQuestions} multiple-choice questions.
For each question:
1. Be specific to facts in the transcript
2. Include 4 options (A, B, C, D)
3. Indicate the correct answer letter

Format exactly:
QUESTION: [text]
A: [option]
B: [option]
C: [option]
D: [option]
CORRECT: [letter]

Transcript:
${transcriptText.slice(0, 12000)}${transcriptText.length > 12000 ? '…' : ''}`;

  const raw = await invokeBedrockText(prompt, 'amazon.nova-lite-v1:0', 2500);
  return parseQuizResponse(raw);
}

export function parseQuizResponse(responseText: string): QuizQuestion[] {
  const questions: QuizQuestion[] = [];
  let current: Partial<QuizQuestion> & { options?: Array<{ letter: string; text: string }> } =
    {};

  for (const line of responseText.trim().split('\n')) {
    const trimmed = line.trim();
    if (trimmed.startsWith('QUESTION:')) {
      if (current.question && current.options?.length && current.correct) {
        questions.push(current as QuizQuestion);
      }
      current = { question: trimmed.slice('QUESTION:'.length).trim(), options: [] };
    } else if (/^[A-D]:/.test(trimmed)) {
      current.options = current.options || [];
      current.options.push({
        letter: trimmed[0],
        text: trimmed.slice(2).trim(),
      });
    } else if (trimmed.startsWith('CORRECT:')) {
      current.correct = trimmed.slice('CORRECT:'.length).trim();
    }
  }

  if (current.question && current.options?.length && current.correct) {
    questions.push(current as QuizQuestion);
  }

  return questions;
}

export function scoreQuiz(
  questions: QuizQuestion[],
  answers: Record<string, string>
): { correct: number; total: number; results: Record<string, boolean> } {
  let correct = 0;
  const results: Record<string, boolean> = {};

  questions.forEach((q, i) => {
    const key = `quiz_q_${i}`;
    const userAnswer = answers[key];
    const isCorrect = userAnswer != null && userAnswer === q.correct;
    if (isCorrect) correct += 1;
    results[key] = isCorrect;
  });

  return { correct, total: questions.length, results };
}
