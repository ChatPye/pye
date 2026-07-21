'use client';

import { useCallback, useState } from 'react';

type QuizQuestion = {
  question: string;
  options: Array<{ letter: string; text: string }>;
  correct: string;
};

type Flashcard = { front: string; back: string };

export function StudyPanel({ videoId }: { videoId?: string }) {
  const [mode, setMode] = useState<'quiz' | 'flashcards' | null>(null);
  const [quizLoading, setQuizLoading] = useState(false);
  const [cardLoading, setCardLoading] = useState(false);
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [score, setScore] = useState<{ correct: number; total: number } | null>(null);
  const [cards, setCards] = useState<Flashcard[]>([]);
  const [cardIndex, setCardIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [error, setError] = useState('');

  const clearQuiz = useCallback(() => {
    setQuestions([]);
    setAnswers({});
    setScore(null);
  }, []);

  const clearFlashcards = useCallback(() => {
    setCards([]);
    setCardIndex(0);
    setFlipped(false);
  }, []);

  const switchMode = useCallback((next: 'quiz' | 'flashcards') => {
    if (mode && mode !== next) {
      const label = mode === 'quiz' ? 'quiz' : 'flashcards';
      if (!window.confirm(`Switch to ${next}? Your current ${label} view will be cleared.`)) return false;
      if (mode === 'quiz') clearQuiz();
      else clearFlashcards();
    }
    setMode(next);
    setError('');
    return true;
  }, [clearFlashcards, clearQuiz, mode]);

  const loadQuiz = useCallback(async () => {
    if (!videoId) return;
    if (!switchMode('quiz')) return;
    setQuizLoading(true);
    setError('');
    setScore(null);
    setAnswers({});
    try {
      let res = await fetch(`/api/video/${encodeURIComponent(videoId)}/quiz`, {
        credentials: 'include',
      });
      let data = await res.json();
      if (data.success && data.questions?.length) {
        setQuestions(data.questions);
        return;
      }
      res = await fetch(`/api/video/${encodeURIComponent(videoId)}/quiz`, {
        method: 'POST',
        credentials: 'include',
      });
      data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Quiz generation failed');
      }
      setQuestions(data.questions ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Quiz failed');
    } finally {
      setQuizLoading(false);
    }
  }, [switchMode, videoId]);

  const submitQuiz = useCallback(async () => {
    let correct = 0;
    questions.forEach((q, i) => {
      if (answers[`quiz_q_${i}`] === q.correct) correct += 1;
    });
    setScore({ correct, total: questions.length });
    const evidence = questions.map((q, i) => ({
      question: q.question,
      selected: answers[`quiz_q_${i}`] ?? null,
      correct: q.correct,
    }));
    await fetch('/api/skillproof/evidence', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        videoId,
        workspace: 'general',
        action: 'skillproof.quiz_completed',
        score: correct,
        total: questions.length,
        answers: evidence,
        reflection: `Completed the generated quiz with ${correct} out of ${questions.length} correct.`,
      }),
    }).catch(() => null);
  }, [answers, questions, videoId]);

  const loadFlashcards = useCallback(async () => {
    if (!videoId) return;
    if (!switchMode('flashcards')) return;
    setCardLoading(true);
    setError('');
    setCardIndex(0);
    setFlipped(false);
    try {
      let res = await fetch(`/api/video/${encodeURIComponent(videoId)}/flashcards`, {
        credentials: 'include',
      });
      let data = await res.json();
      if (data.success && data.cards?.length) {
        setCards(data.cards);
        return;
      }
      res = await fetch(`/api/video/${encodeURIComponent(videoId)}/flashcards`, {
        method: 'POST',
        credentials: 'include',
      });
      data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Flashcard generation failed');
      }
      setCards(data.cards ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Flashcards failed');
    } finally {
      setCardLoading(false);
    }
  }, [switchMode, videoId]);

  const completeFlashcards = useCallback(() => {
    fetch('/api/skillproof/evidence', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        videoId,
        workspace: 'general',
        action: 'skillproof.flashcards_reviewed',
        total: cards.length,
        reflection: `Reviewed ${cards.length} flashcards generated from this tutorial.`,
      }),
    }).catch(() => null);
  }, [cards.length, videoId]);

  if (!videoId) return null;

  return (
    <div className="space-y-4 rounded-lg border border-zinc-800 bg-zinc-900/40 p-4">
      <h4 className="text-sm font-semibold text-white">Study tools</h4>
      {error && <p className="text-xs text-rose-400">{error}</p>}

      <div className="flex flex-wrap gap-2" role="tablist" aria-label="Study tools">
        <button
          type="button"
          onClick={loadQuiz}
          disabled={quizLoading}
          className={`rounded-lg border px-3 py-1.5 text-xs hover:bg-violet-500/20 disabled:opacity-50 ${mode === 'quiz' ? 'border-violet-300 bg-violet-500/25 text-white' : 'border-violet-500/40 bg-violet-500/10 text-violet-200'}`}
        >
          {quizLoading ? 'Generating quiz…' : questions.length ? 'Regenerate quiz' : 'Generate quiz'}
        </button>
        <button
          type="button"
          onClick={loadFlashcards}
          disabled={cardLoading}
          className={`rounded-lg border px-3 py-1.5 text-xs hover:bg-cyan-500/20 disabled:opacity-50 ${mode === 'flashcards' ? 'border-cyan-300 bg-cyan-500/25 text-white' : 'border-cyan-500/40 bg-cyan-500/10 text-cyan-200'}`}
        >
          {cardLoading ? 'Generating cards…' : cards.length ? 'Regenerate flashcards' : 'Generate flashcards'}
        </button>
      </div>

      {mode === 'quiz' && questions.length > 0 && (
        <div className="space-y-3">
          {questions.map((q, i) => (
            <div key={i} className="rounded-lg border border-zinc-800 p-3 text-sm">
              <p className="mb-2 font-medium text-white">
                {i + 1}. {q.question}
              </p>
              <div className="space-y-1">
                {q.options.map((opt) => (
                  <label key={opt.letter} className="flex cursor-pointer items-center gap-2 text-zinc-300">
                    <input
                      type="radio"
                      name={`quiz_q_${i}`}
                      value={opt.letter}
                      checked={answers[`quiz_q_${i}`] === opt.letter}
                      onChange={() => setAnswers((prev) => ({ ...prev, [`quiz_q_${i}`]: opt.letter }))}
                    />
                    <span>
                      {opt.letter}: {opt.text}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          ))}
          <button
            type="button"
            onClick={submitQuiz}
            className="rounded-lg bg-violet-600 px-4 py-2 text-xs font-medium text-white hover:bg-violet-500"
          >
            Submit quiz
          </button>
          {score && (
            <p className="text-sm text-emerald-400">
              Score: {score.correct}/{score.total} (
              {Math.round((score.correct / Math.max(1, score.total)) * 100)}%)
            </p>
          )}
        </div>
      )}

      {mode === 'flashcards' && cards.length > 0 && (
        <div className="space-y-2">
          <button
            type="button"
            onClick={() => setFlipped((f) => !f)}
            className="min-h-[100px] w-full rounded-lg border border-zinc-700 bg-zinc-950/60 p-4 text-left text-sm text-zinc-200"
          >
            {flipped ? cards[cardIndex]?.back : cards[cardIndex]?.front}
          </button>
          <div className="flex items-center justify-between text-xs text-zinc-500">
            <span>
              Card {cardIndex + 1} of {cards.length}
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={cardIndex === 0}
                onClick={() => {
                  setCardIndex((i) => i - 1);
                  setFlipped(false);
                }}
                className="rounded border border-zinc-700 px-2 py-1 disabled:opacity-40"
              >
                Prev
              </button>
              <button
                type="button"
                disabled={cardIndex >= cards.length - 1}
                onClick={() => {
                  setCardIndex((i) => i + 1);
                  setFlipped(false);
                }}
                className="rounded border border-zinc-700 px-2 py-1 disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
          <button
            type="button"
            onClick={completeFlashcards}
            className="rounded-lg border border-cyan-500/40 px-3 py-1.5 text-xs text-cyan-200 hover:bg-cyan-500/10"
          >
            Save review as evidence
          </button>
        </div>
      )}
    </div>
  );
}
