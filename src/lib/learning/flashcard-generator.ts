import { invokeBedrockText } from '@/lib/bedrock-invoke';

export type Flashcard = { front: string; back: string };

/** Generate flashcards from transcript (Talk-to-Videos pattern, Nova on Bedrock). */
export async function generateFlashcardsFromTranscript(
  transcriptText: string,
  numCards = 10
): Promise<Flashcard[]> {
  const prompt = `Create ${numCards} educational flashcards from this video transcript.
Each flashcard needs "front" (question/term) and "back" (answer/definition).
Mix definitions, conceptual questions, and fill-in-the-blank.

Return ONLY valid JSON array:
[{"front":"...","back":"..."}]

Transcript:
${transcriptText.slice(0, 12000)}`;

  const raw = await invokeBedrockText(prompt, 'amazon.nova-lite-v1:0', 2000);
  return parseFlashcardsJson(raw);
}

export function parseFlashcardsJson(content: string): Flashcard[] {
  const start = content.indexOf('[');
  const end = content.lastIndexOf(']') + 1;
  if (start < 0 || end <= start) {
    return [{ front: 'Could not generate flashcards', back: 'Try again after processing completes.' }];
  }

  try {
    const parsed = JSON.parse(content.slice(start, end)) as Flashcard[];
    return parsed.filter((c) => c.front && c.back);
  } catch {
    return [{ front: 'Parse error', back: 'Regenerate flashcards from the notes tab.' }];
  }
}
