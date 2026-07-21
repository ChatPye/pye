import { extractGeminiText, extractJsonArray } from '@/lib/video/transcript'

export type StudyQuizQuestion = {
  question: string
  options: Array<{ letter: string; text: string }>
  correct: string
}

export type StudyFlashcard = { front: string; back: string }

function transcriptFallback(transcript: string): string[] {
  return transcript
    .split(/(?<=[.!?])\s+/)
    .map((line) => line.trim())
    .filter((line) => line.length > 24)
    .slice(0, 8)
}

async function askGemini(prompt: string): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) throw new Error('Gemini is not configured')
  const response = await fetch('https://generativelanguage.googleapis.com/v1beta/interactions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
    body: JSON.stringify({
      model: process.env.GEMINI_CHAT_MODEL || process.env.GEMINI_VIDEO_MODEL || 'gemini-3.6-flash',
      input: [{ type: 'text', text: prompt }],
    }),
  })
  if (!response.ok) throw new Error(`Gemini returned ${response.status}`)
  return extractGeminiText(await response.json() as Record<string, unknown>)
}

export async function generateGeminiQuiz(transcript: string, count = 5): Promise<StudyQuizQuestion[]> {
  const source = transcript.slice(0, 18000)
  try {
    const output = await askGemini(`You are a careful instructional designer. Create ${count} short, answerable multiple-choice questions from this tutorial transcript. Do not use knowledge outside the transcript. Return ONLY a JSON array with this exact shape: [{"question":"...","options":[{"letter":"A","text":"..."},{"letter":"B","text":"..."},{"letter":"C","text":"..."},{"letter":"D","text":"..."}],"correct":"A"}].\n\nTranscript:\n${source}`)
    const items = extractJsonArray(output) ?? []
    const questions = items.map((value) => {
      const item = value as Record<string, unknown>
      const options = Array.isArray(item.options) ? item.options.map((option) => {
        const entry = option as Record<string, unknown>
        return { letter: String(entry.letter ?? '').trim().slice(0, 1), text: String(entry.text ?? '').trim().slice(0, 260) }
      }).filter((option) => /^[A-D]$/.test(option.letter) && option.text) : []
      return { question: String(item.question ?? '').trim().slice(0, 420), options, correct: String(item.correct ?? '').trim().slice(0, 1) }
    }).filter((question): question is StudyQuizQuestion => Boolean(question.question) && question.options.length === 4 && /^[A-D]$/.test(question.correct))
    if (questions.length) return questions.slice(0, count)
  } catch {
    // A usable study flow is more important than a transient model error.
  }

  return transcriptFallback(transcript).slice(0, Math.min(3, count)).map((line, index) => ({
    question: `Which statement is taught in this section?`,
    options: [
      { letter: 'A', text: line },
      { letter: 'B', text: 'Skip the practical step and move to the final result.' },
      { letter: 'C', text: 'Use an unrelated tool instead of following the tutorial.' },
      { letter: 'D', text: 'Ignore the explanation and rely only on memory.' },
    ],
    correct: 'A',
  }))
}

export async function generateGeminiFlashcards(transcript: string, count = 8): Promise<StudyFlashcard[]> {
  const source = transcript.slice(0, 18000)
  try {
    const output = await askGemini(`Turn this tutorial transcript into ${count} concise study flashcards. Keep each answer grounded in the tutorial and useful for a learner doing the work. Return ONLY JSON: [{"front":"question or key term","back":"clear answer"}].\n\nTranscript:\n${source}`)
    const items = extractJsonArray(output) ?? []
    const cards = items.map((value) => {
      const item = value as Record<string, unknown>
      return { front: String(item.front ?? '').trim().slice(0, 260), back: String(item.back ?? '').trim().slice(0, 500) }
    }).filter((card): card is StudyFlashcard => Boolean(card.front && card.back))
    if (cards.length) return cards.slice(0, count)
  } catch {
    // Fall through to transparent transcript cards.
  }
  return transcriptFallback(transcript).slice(0, Math.min(5, count)).map((line, index) => ({
    front: `Tutorial insight ${index + 1}`,
    back: line,
  }))
}
