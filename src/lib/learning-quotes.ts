export type LearningQuote = {
  text: string;
  author: string;
};

export const LEARNING_QUOTES: LearningQuote[] = [
  {
    text: 'Live as if you were to die tomorrow. Learn as if you were to live forever.',
    author: 'Mahatma Gandhi',
  },
  {
    text: 'The capacity to learn is a gift; the ability to learn is a skill; the willingness to learn is a choice.',
    author: 'Brian Herbert',
  },
  {
    text: 'An investment in knowledge pays the best interest.',
    author: 'Benjamin Franklin',
  },
  {
    text: 'Tell me and I forget. Teach me and I remember. Involve me and I learn.',
    author: 'Benjamin Franklin',
  },
  {
    text: 'The expert in anything was once a beginner.',
    author: 'Helen Hayes',
  },
  {
    text: 'Learning is not attained by chance; it must be sought for with ardor and attended to with diligence.',
    author: 'Abigail Adams',
  },
  {
    text: 'The beautiful thing about learning is that nobody can take it away from you.',
    author: 'B.B. King',
  },
  {
    text: 'Education is the passport to the future, for tomorrow belongs to those who prepare for it today.',
    author: 'Malcolm X',
  },
];

export function pickLearningQuote(seed?: string): LearningQuote {
  if (!seed) {
    return LEARNING_QUOTES[Math.floor(Math.random() * LEARNING_QUOTES.length)];
  }
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash + seed.charCodeAt(i) * (i + 1)) % LEARNING_QUOTES.length;
  }
  return LEARNING_QUOTES[hash];
}
